import prisma from "../utils/prisma";
import { TaskContract, TaskStatus } from "../types/domain";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "../utils/errors";
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
  // Caller must own either the buyer or seller agent
  const buyerAgent = await prisma.agent.findUnique({
    where: { id: task.buyerAgentId },
    select: { ownerId: true },
  });
  if (buyerAgent?.ownerId === callerId) return;

  if (task.sellerAgentId) {
    const sellerAgent = await prisma.agent.findUnique({
      where: { id: task.sellerAgentId },
      select: { ownerId: true },
    });
    if (sellerAgent?.ownerId === callerId) return;
  }

  throw new ForbiddenError("You are not a party to this task");
}

// ─── Pagination helpers ──────────────────────────────────────────────────────

function clampPagination(limit?: number, offset?: number) {
  return {
    take: Math.min(Math.max(1, limit ?? 20), 100),
    skip: Math.max(0, offset ?? 0),
  };
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

    // Authorization: caller must own the buyer agent
    if (callerId) {
      await assertCallerOwnsAgent(input.buyerAgentId, callerId);
    }

    const buyer = await prisma.agent.findUnique({ where: { id: input.buyerAgentId } });
    if (!buyer) throw new NotFoundError("Agent", input.buyerAgentId);

    const timeoutMs = input.timeoutMs ?? 300000;
    const expiresAt = new Date(Date.now() + timeoutMs);

    const task = await prisma.taskContract.create({
      data: {
        buyerAgentId: input.buyerAgentId,
        capabilityRequested: input.capabilityRequested.trim(),
        inputSchema: input.inputSchema,
        inputData: input.inputData ?? undefined,
        outputSchema: input.outputSchema ?? undefined,
        qualityCriteria: input.qualityCriteria ?? undefined,
        price: input.price,
        currency: input.currency ?? "USD",
        timeoutMs,
        expiresAt,
        status: "OPEN",
      },
    });

    await escrowService.holdFunds(task.id, task.price, task.currency);
    return task as unknown as TaskContract;
  }

  async getById(id: string, callerId?: string): Promise<TaskContract> {
    const task = await prisma.taskContract.findUnique({
      where: { id },
      include: { buyerAgent: true, sellerAgent: true },
    });
    if (!task) throw new NotFoundError("TaskContract", id);

    // Authorization: caller must be a party to the task
    if (callerId) {
      await assertCallerIsParty(task as unknown as TaskContract, callerId);
    }

    return task as unknown as TaskContract;
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
      const agentIds = callerAgents.map((a: any) => a.id);
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

    return { tasks: tasks as unknown as TaskContract[], total };
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

    const seller = await prisma.agent.findUnique({ where: { id: sellerAgentId } });
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
      return updated as unknown as TaskContract;
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
      return updated as unknown as TaskContract;
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

      await reputationService.recordTaskCompletion(
        task.sellerAgentId!,
        taskId,
        true,
        responseTimeMs,
        (verificationResult as any)?.qualityScore ?? 80
      );

      const updated = await prisma.taskContract.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          verificationResult: verificationResult ?? undefined,
        },
      });
      return updated as unknown as TaskContract;
    } else {
      await escrowService.refundFunds(taskId);

      if (task.sellerAgentId) {
        await reputationService.recordTaskCompletion(task.sellerAgentId, taskId, false, 0, 0);
      }

      const updated = await prisma.taskContract.update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          verificationResult: verificationResult ?? undefined,
        },
      });
      return updated as unknown as TaskContract;
    }
  }

  async dispute(taskId: string, reason: string, callerId?: string): Promise<TaskContract> {
    const task = await this.getByIdInternal(taskId);

    // Authorization: caller must be a party to the task
    if (callerId) {
      await assertCallerIsParty(task as unknown as TaskContract, callerId);
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
    return updated as unknown as TaskContract;
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
      await assertCallerIsParty(task as unknown as TaskContract, callerId);
    }

    if (task.status !== "DISPUTED") {
      throw new ConflictError(`Cannot resolve: task is not disputed (status: ${task.status})`);
    }

    if (resolution === "release_to_seller") {
      await escrowService.releaseFunds(taskId);
      if (task.sellerAgentId) {
        await reputationService.recordEvent(task.sellerAgentId, taskId, "DISPUTE_RESOLVED", 1);
      }
      const updated = await prisma.taskContract.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          verificationResult: { disputeResolution: resolution, notes },
        },
      });
      return updated as unknown as TaskContract;
    } else {
      await escrowService.refundFunds(taskId);
      if (task.sellerAgentId) {
        await reputationService.recordEvent(task.sellerAgentId, taskId, "DISPUTE_RESOLVED", 0);
      }
      const updated = await prisma.taskContract.update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          verificationResult: { disputeResolution: resolution, notes },
        },
      });
      return updated as unknown as TaskContract;
    }
  }

  async expireStale(): Promise<number> {
    const result = await prisma.taskContract.updateMany({
      where: { status: "OPEN", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  // Internal getById without authorization check (for service-layer use)
  private async getByIdInternal(id: string): Promise<any> {
    const task = await prisma.taskContract.findUnique({
      where: { id },
      include: { buyerAgent: true, sellerAgent: true },
    });
    if (!task) throw new NotFoundError("TaskContract", id);
    return task;
  }
}

export const taskService = new TaskService();
