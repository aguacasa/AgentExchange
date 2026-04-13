import prisma from "../utils/prisma";
import { TaskContract, TaskStatus } from "../types/domain";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "../utils/errors";
import { clampPagination } from "../utils/pagination";
import { escrowService } from "./escrow.service";
import { reputationService } from "./reputation.service";

export interface CreateTaskInput {
  buyerAgentId: string;
  capabilityRequested: string;
  inputSchema: Record<string, unknown>;
  inputData?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  qualityCriteria?: Record<string, unknown>;
  price: number;
  currency?: string;
  timeoutMs?: number;
}

export interface SearchTasksInput {
  status?: TaskStatus;
  buyerAgentId?: string;
  sellerAgentId?: string;
  capability?: string;
  limit?: number;
  offset?: number;
}

// ─── Authorization helpers ───────────────────────────────────────────────────

async function assertCallerOwnsAgent(agentId: string, callerId: string): Promise<void> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { ownerId: true } });
  if (!agent) throw new NotFoundError("Agent", agentId);
  if (agent.ownerId !== callerId) {
    throw new ForbiddenError("You do not own this agent");
  }
}

async function assertCallerIsParty(task: TaskContract, callerId: string): Promise<void> {
  // Check if loaded agent relations already have ownerId (avoids extra queries)
  const taskAny = task as any;
  if (taskAny.buyerAgent?.ownerId === callerId) return;
  if (taskAny.sellerAgent?.ownerId === callerId) return;

  // Fallback: fetch owner IDs in parallel
  const queries: Promise<{ ownerId: string } | null>[] = [
    prisma.agent.findUnique({ where: { id: task.buyerAgentId }, select: { ownerId: true } }),
  ];
  if (task.sellerAgentId) {
    queries.push(
      prisma.agent.findUnique({ where: { id: task.sellerAgentId }, select: { ownerId: true } })
    );
  }
  const results = await Promise.all(queries);
  if (results.some((r) => r?.ownerId === callerId)) return;

  throw new ForbiddenError("You are not a party to this task");
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TaskService {
  async create(input: CreateTaskInput, callerId?: string): Promise<TaskContract> {
    // Input validation
    if (!Number.isFinite(input.price) || input.price <= 0) {
      throw new ValidationError("Price must be a positive finite number");
    }
    if (!Number.isInteger(input.price)) {
      throw new ValidationError("Price must be an integer (cents)");
    }
    if (!input.capabilityRequested || input.capabilityRequested.trim() === "") {
      throw new ValidationError("capabilityRequested must be a non-empty string");
    }
    if (input.timeoutMs !== undefined) {
      if (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) {
        throw new ValidationError("timeoutMs must be a positive finite number");
      }
      if (input.timeoutMs > 86400000) {
        throw new ValidationError("timeoutMs cannot exceed 24 hours (86400000ms)");
      }
    }

    // Authorization + existence check: caller must own the buyer agent
    // assertCallerOwnsAgent also verifies the agent exists (throws NotFoundError)
    if (callerId) {
      await assertCallerOwnsAgent(input.buyerAgentId, callerId);
    } else {
      const buyer = await prisma.agent.findUnique({ where: { id: input.buyerAgentId } });
      if (!buyer) throw new NotFoundError("Agent", input.buyerAgentId);
    }

    const timeoutMs = input.timeoutMs ?? 300000;
    const expiresAt = new Date(Date.now() + timeoutMs);

    const task = await prisma.taskContract.create({
      data: {
        buyerAgentId: input.buyerAgentId,
        capabilityRequested: input.capabilityRequested.trim(),
        inputSchema: input.inputSchema,
        inputData: input.inputData,
        outputSchema: input.outputSchema,
        qualityCriteria: input.qualityCriteria,
        price: input.price,
        currency: input.currency ?? "USD",
        timeoutMs,
        expiresAt,
        status: "OPEN",
      },
    });

    await escrowService.holdFunds(task.id, task.price, task.currency);
    return task;
  }

  async getById(id: string, callerId?: string): Promise<TaskContract> {
    const task = await prisma.taskContract.findUnique({
      where: { id },
      include: { buyerAgent: true, sellerAgent: true },
    });
    if (!task) throw new NotFoundError("TaskContract", id);

    // Authorization: caller must be a party to the task
    if (callerId) {
      await assertCallerIsParty(task, callerId);
    }

    return task;
  }

  async search(
    input: SearchTasksInput,
    callerId?: string
  ): Promise<{ tasks: TaskContract[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (input.status) where.status = input.status;
    if (input.buyerAgentId) where.buyerAgentId = input.buyerAgentId;
    if (input.sellerAgentId) where.sellerAgentId = input.sellerAgentId;
    if (input.capability) where.capabilityRequested = input.capability;

    // Scope to caller's agents
    if (callerId) {
      const callerAgents = await prisma.agent.findMany({
        where: { ownerId: callerId },
        select: { id: true },
      });
      const agentIds = callerAgents.map((a: { id: string }) => a.id);
      where.OR = [
        { buyerAgentId: { in: agentIds } },
        { sellerAgentId: { in: agentIds } },
      ];
    }

    const { take, skip } = clampPagination(input.limit, input.offset);

    const [tasks, total] = await Promise.all([
      prisma.taskContract.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { buyerAgent: true, sellerAgent: true },
      }),
      prisma.taskContract.count({ where: where as any }),
    ]);

    return { tasks, total };
  }

  async accept(taskId: string, sellerAgentId: string, callerId?: string): Promise<TaskContract> {
    // Authorization: caller must own the seller agent
    if (callerId) {
      await assertCallerOwnsAgent(sellerAgentId, callerId);
    }

    const task = await this.getByIdInternal(taskId);

    // Check expiry
    if (task.expiresAt && new Date(task.expiresAt) < new Date()) {
      await prisma.taskContract.update({
        where: { id: taskId },
        data: { status: "EXPIRED" },
      });
      throw new ConflictError("Task has expired");
    }

    if (task.buyerAgentId === sellerAgentId) {
      throw new ValidationError("An agent cannot accept its own task");
    }

    const seller = await prisma.agent.findUnique({
      where: { id: sellerAgentId },
      select: { capabilities: true },
    });
    if (!seller) throw new NotFoundError("Agent", sellerAgentId);
    if (!seller.capabilities.includes(task.capabilityRequested)) {
      throw new ValidationError(`Seller agent does not have capability: ${task.capabilityRequested}`);
    }

    // Atomic status check + update to prevent race conditions
    try {
      const updated = await prisma.taskContract.update({
        where: { id: taskId, status: "OPEN" },
        data: {
          sellerAgentId,
          status: "IN_PROGRESS",
          acceptedAt: new Date(),
        },
      });
      return updated;
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw new ConflictError("Task is no longer open for acceptance");
      }
      throw err;
    }
  }

  async submit(
    taskId: string,
    sellerAgentId: string,
    outputData: Record<string, unknown>,
    callerId?: string
  ): Promise<TaskContract> {
    // Validate output data
    if (!outputData || typeof outputData !== "object" || Object.keys(outputData).length === 0) {
      throw new ValidationError("outputData must be a non-empty object");
    }

    // Authorization: caller must own the seller agent
    if (callerId) {
      await assertCallerOwnsAgent(sellerAgentId, callerId);
    }

    const task = await this.getByIdInternal(taskId);

    if (task.sellerAgentId !== sellerAgentId) {
      throw new ValidationError("Only the assigned seller can submit work");
    }

    // Atomic status check + update
    try {
      const updated = await prisma.taskContract.update({
        where: { id: taskId, status: "IN_PROGRESS" },
        data: {
          outputData,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });
      return updated;
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw new ConflictError("Task is not in progress");
      }
      throw err;
    }
  }

  async verify(
    taskId: string,
    passed: boolean,
    verificationResult?: Record<string, unknown>,
    callerId?: string
  ): Promise<TaskContract> {
    const task = await this.getByIdInternal(taskId);

    // Authorization: only the buyer agent's owner can verify
    if (callerId) {
      await assertCallerOwnsAgent(task.buyerAgentId, callerId);
    }

    if (task.status !== "SUBMITTED") {
      throw new ConflictError(`Task is not submitted for verification (status: ${task.status})`);
    }

    if (passed) {
      await escrowService.releaseFunds(taskId);

      const responseTimeMs = task.submittedAt && task.acceptedAt
        ? new Date(task.submittedAt).getTime() - new Date(task.acceptedAt).getTime()
        : 0;

      await reputationService.recordTaskCompletion({
        agentId: task.sellerAgentId!,
        taskContractId: taskId,
        succeeded: true,
        responseTimeMs,
        qualityScore: (verificationResult as Record<string, unknown>)?.qualityScore as number ?? 80,
      });

      const updated = await prisma.taskContract.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          verificationResult: verificationResult,
        },
      });
      return updated;
    } else {
      await escrowService.refundFunds(taskId);

      if (task.sellerAgentId) {
        await reputationService.recordTaskCompletion({
          agentId: task.sellerAgentId,
          taskContractId: taskId,
          succeeded: false,
          responseTimeMs: 0,
          qualityScore: 0,
        });
      }

      const updated = await prisma.taskContract.update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          verificationResult: verificationResult,
        },
      });
      return updated;
    }
  }

  async dispute(taskId: string, reason: string, callerId?: string): Promise<TaskContract> {
    const task = await this.getByIdInternal(taskId);

    // Authorization: caller must be a party to the task
    if (callerId) {
      await assertCallerIsParty(task, callerId);
    }

    if (!["SUBMITTED", "IN_PROGRESS"].includes(task.status)) {
      throw new ConflictError(`Cannot dispute task in status: ${task.status}`);
    }

    await escrowService.freezeFunds(taskId, reason);

    if (task.sellerAgentId) {
      await reputationService.recordEvent(task.sellerAgentId, taskId, "DISPUTE_RAISED", 1);
    }

    const updated = await prisma.taskContract.update({
      where: { id: taskId },
      data: {
        status: "DISPUTED",
        disputeReason: reason,
      },
    });
    return updated;
  }

  async resolveDispute(
    taskId: string,
    resolution: "release_to_seller" | "refund_to_buyer",
    notes?: string,
    callerId?: string
  ): Promise<TaskContract> {
    const task = await this.getByIdInternal(taskId);

    // Authorization: caller must be a party to the task
    if (callerId) {
      await assertCallerIsParty(task, callerId);
    }

    if (task.status !== "DISPUTED") {
      throw new ConflictError(`Cannot resolve: task is not disputed (status: ${task.status})`);
    }

    const releaseToSeller = resolution === "release_to_seller";

    if (releaseToSeller) {
      await escrowService.releaseFunds(taskId);
    } else {
      await escrowService.refundFunds(taskId);
    }

    if (task.sellerAgentId) {
      await reputationService.recordEvent(
        task.sellerAgentId, taskId, "DISPUTE_RESOLVED", releaseToSeller ? 1 : 0
      );
    }

    const updated = await prisma.taskContract.update({
      where: { id: taskId },
      data: {
        status: releaseToSeller ? "COMPLETED" : "FAILED",
        ...(releaseToSeller && { completedAt: new Date() }),
        verificationResult: { disputeResolution: resolution, notes },
      },
    });
    return updated;
  }

  async expireStale(): Promise<number> {
    const result = await prisma.taskContract.updateMany({
      where: { status: "OPEN", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  // Internal getById without authorization check (for service-layer use)
  private async getByIdInternal(id: string): Promise<TaskContract> {
    const task = await prisma.taskContract.findUnique({
      where: { id },
      include: { buyerAgent: true, sellerAgent: true },
    });
    if (!task) throw new NotFoundError("TaskContract", id);
    return task;
  }
}

export const taskService = new TaskService();
