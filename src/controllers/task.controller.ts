import {
  Controller,
  Get,
  Post,
  Route,
  Path,
  Body,
  Query,
  Tags,
  Security,
  Request,
  SuccessResponse,
} from "tsoa";
import { taskService, CreateTaskInput } from "../services/task.service";
import { ForbiddenError } from "../utils/errors";
import { TaskStatus } from "../types/domain";
import { AuthenticatedRequest } from "../middleware/auth";
import { Express } from "express";

// Helper to extract authenticated caller's ownerId
function getCallerId(req: Express.Request): string {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.apiKey?.ownerId) {
    throw new ForbiddenError("Authentication required");
  }
  return authReq.apiKey.ownerId;
}

interface CreateTaskBody {
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

interface SubmitTaskBody {
  sellerAgentId: string;
  outputData: Record<string, unknown>;
}

interface VerifyTaskBody {
  passed: boolean;
  verificationResult?: Record<string, unknown>;
}

interface DisputeTaskBody {
  reason: string;
}

interface AcceptTaskBody {
  sellerAgentId: string;
}

interface ResolveDisputeBody {
  resolution: "release_to_seller" | "refund_to_buyer";
  notes?: string;
}

interface TaskResponse {
  id: string;
  buyerAgentId: string;
  sellerAgentId?: string | null;
  capabilityRequested: string;
  inputSchema: unknown;
  inputData?: unknown;
  outputSchema?: unknown;
  outputData?: unknown;
  qualityCriteria?: unknown;
  price: number;
  currency: string;
  timeoutMs: number;
  status: TaskStatus;
  acceptedAt?: Date | null;
  submittedAt?: Date | null;
  completedAt?: Date | null;
  expiresAt?: Date | null;
  verificationResult?: unknown;
  disputeReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Route("tasks")
@Tags("Tasks")
export class TaskController extends Controller {
  /**
   * Create a new task contract. This is how a buyer agent posts a job.
   * Payment is automatically held in escrow.
   * The buyer agent must be owned by the authenticated caller.
   */
  @Post()
  @Security("api_key", ["write"])
  @SuccessResponse(201, "Task created")
  public async createTask(
    @Body() body: CreateTaskBody,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    this.setStatus(201);
    const callerId = getCallerId(req);
    const task = await taskService.create(body as CreateTaskInput, callerId);
    return task as TaskResponse;
  }

  /**
   * List and filter task contracts.
   * Requires authentication — only returns tasks belonging to the caller's agents.
   */
  @Get()
  @Security("api_key", ["read"])
  public async searchTasks(
    @Query() status?: TaskStatus,
    @Query() buyerAgentId?: string,
    @Query() sellerAgentId?: string,
    @Query() capability?: string,
    @Query() limit?: number,
    @Query() offset?: number,
    @Request() req?: Express.Request
  ): Promise<{ tasks: TaskResponse[]; total: number }> {
    const callerId = req ? getCallerId(req) : undefined;
    const result = await taskService.search({
      status,
      buyerAgentId,
      sellerAgentId,
      capability,
      limit,
      offset,
    }, callerId);
    return result as { tasks: TaskResponse[]; total: number };
  }

  /**
   * Get a single task contract with full details.
   * Requires authentication — caller must own the buyer or seller agent.
   */
  @Get("{taskId}")
  @Security("api_key", ["read"])
  public async getTask(
    @Path() taskId: string,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    const callerId = getCallerId(req);
    const task = await taskService.getById(taskId, callerId);
    return task as TaskResponse;
  }

  /**
   * Seller agent accepts an open task.
   * The seller agent must be owned by the authenticated caller.
   */
  @Post("{taskId}/accept")
  @Security("api_key", ["write"])
  public async acceptTask(
    @Path() taskId: string,
    @Body() body: AcceptTaskBody,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    const callerId = getCallerId(req);
    const task = await taskService.accept(taskId, body.sellerAgentId, callerId);
    return task as TaskResponse;
  }

  /**
   * Seller agent submits completed work.
   * The seller agent must be owned by the authenticated caller.
   */
  @Post("{taskId}/submit")
  @Security("api_key", ["write"])
  public async submitTask(
    @Path() taskId: string,
    @Body() body: SubmitTaskBody,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    const callerId = getCallerId(req);
    const task = await taskService.submit(taskId, body.sellerAgentId, body.outputData, callerId);
    return task as TaskResponse;
  }

  /**
   * Verify the submitted output. Only the buyer agent's owner can verify.
   */
  @Post("{taskId}/verify")
  @Security("api_key", ["write"])
  public async verifyTask(
    @Path() taskId: string,
    @Body() body: VerifyTaskBody,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    const callerId = getCallerId(req);
    const task = await taskService.verify(taskId, body.passed, body.verificationResult, callerId);
    return task as TaskResponse;
  }

  /**
   * Raise a dispute on a task. Only the buyer or seller can dispute.
   */
  @Post("{taskId}/dispute")
  @Security("api_key", ["write"])
  public async disputeTask(
    @Path() taskId: string,
    @Body() body: DisputeTaskBody,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    const callerId = getCallerId(req);
    const task = await taskService.dispute(taskId, body.reason, callerId);
    return task as TaskResponse;
  }

  /**
   * Resolve a disputed task. Releases escrow to seller or refunds buyer.
   */
  @Post("{taskId}/resolve")
  @Security("api_key", ["write"])
  public async resolveDispute(
    @Path() taskId: string,
    @Body() body: ResolveDisputeBody,
    @Request() req: Express.Request
  ): Promise<TaskResponse> {
    const callerId = getCallerId(req);
    const task = await taskService.resolveDispute(taskId, body.resolution, body.notes, callerId);
    return task as TaskResponse;
  }
}
