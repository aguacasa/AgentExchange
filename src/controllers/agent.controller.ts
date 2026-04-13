import {
  Controller,
  Get,
  Post,
  Put,
  Route,
  Path,
  Body,
  Query,
  Tags,
  Security,
  Request,
  SuccessResponse,
} from "tsoa";
import { agentService, CreateAgentInput } from "../services/agent.service";
import { matchingService } from "../services/matching.service";
import { reputationService } from "../services/reputation.service";
import { ForbiddenError } from "../utils/errors";
import { AgentStatus, PricingModel, AuthMethod, MetricType } from "../types/domain";
import { AuthenticatedRequest } from "../middleware/auth";
import { Express } from "express";

interface AgentResponse {
  id: string;
  name: string;
  description?: string;
  endpointUrl: string;
  capabilities: string[];
  pricingModel: PricingModel;
  pricePerUnit: number;
  currency: string;
  slaResponseMs?: number;
  slaUptimePct?: number;
  authMethod: AuthMethod;
  status: AgentStatus;
  reputationScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  metadata?: unknown;
  sampleInput?: unknown;
  sampleOutput?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateAgentBody {
  name: string;
  description?: string;
  ownerId: string;
  endpointUrl: string;
  capabilities: string[];
  pricingModel?: "PER_CALL" | "PER_TASK" | "SUBSCRIPTION" | "CUSTOM";
  pricePerUnit?: number;
  currency?: string;
  slaResponseMs?: number;
  slaUptimePct?: number;
  authMethod?: "API_KEY" | "OAUTH2" | "BEARER_TOKEN" | "NONE";
  metadata?: Record<string, unknown>;
  sampleInput?: Record<string, unknown>;
  sampleOutput?: Record<string, unknown>;
}

interface UpdateAgentBody {
  name?: string;
  description?: string;
  endpointUrl?: string;
  capabilities?: string[];
  pricingModel?: "PER_CALL" | "PER_TASK" | "SUBSCRIPTION" | "CUSTOM";
  pricePerUnit?: number;
  slaResponseMs?: number;
  slaUptimePct?: number;
  authMethod?: "API_KEY" | "OAUTH2" | "BEARER_TOKEN" | "NONE";
  metadata?: Record<string, unknown>;
  sampleInput?: Record<string, unknown>;
  sampleOutput?: Record<string, unknown>;
}

interface ReputationEventResponse {
  id: string;
  agentId: string;
  taskContractId?: string | null;
  metricType: MetricType;
  score: number;
  weight: number;
  metadata?: unknown;
  createdAt: Date;
}

interface ReputationResponse {
  agentId: string;
  overallScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  recentEvents: ReputationEventResponse[];
}

interface MatchBreakdown {
  capabilityScore: number;
  priceScore: number;
  reputationScore: number;
  responseTimeScore: number;
  uptimeScore: number;
}

interface MatchResult {
  agent: Record<string, unknown>;
  matchScore: number;
  breakdown: MatchBreakdown;
}

interface MatchResponse {
  matches: MatchResult[];
  total: number;
}

@Route("agents")
@Tags("Agents")
export class AgentController extends Controller {
  /**
   * Register a new AI agent on the marketplace.
   * Returns the agent profile and a unique API key for authentication.
   */
  @Post()
  @SuccessResponse(201, "Agent created")
  public async createAgent(
    @Body() body: CreateAgentBody,
    @Request() req: Express.Request
  ): Promise<{ agent: AgentResponse; apiKey: string }> {
    this.setStatus(201);
    // If authenticated, derive ownerId from the API key (ignore body.ownerId)
    // If unauthenticated (bootstrap), generate a unique ownerId
    const authReq = req as unknown as AuthenticatedRequest;
    const ownerId = authReq.apiKey?.ownerId
      || body.ownerId
      || `owner_${require("crypto").randomUUID()}`;

    const input = { ...body, ownerId } as CreateAgentInput;
    const result = await agentService.create(input);
    return { agent: result.agent as AgentResponse, apiKey: result.apiKey };
  }

  /**
   * Search and list agents by capability, price range, and reputation.
   */
  @Get()
  public async searchAgents(
    @Query() capability?: string,
    @Query() minPrice?: number,
    @Query() maxPrice?: number,
    @Query() minReputation?: number,
    @Query() status?: "ACTIVE" | "INACTIVE" | "SUSPENDED",
    @Query() limit?: number,
    @Query() offset?: number
  ): Promise<{ agents: AgentResponse[]; total: number }> {
    const result = await agentService.search({
      capability,
      minPrice,
      maxPrice,
      minReputation,
      status,
      limit,
      offset,
    });
    return result as { agents: AgentResponse[]; total: number };
  }

  /**
   * Get a single agent's profile. Response is compatible with A2A Agent Card format.
   */
  @Get("{agentId}")
  public async getAgent(@Path() agentId: string): Promise<Record<string, unknown>> {
    const agent = await agentService.getById(agentId);
    return agentService.toAgentCard(agent);
  }

  /**
   * Update an agent's profile. Only the owner can update.
   */
  @Put("{agentId}")
  @Security("api_key")
  public async updateAgent(
    @Path() agentId: string,
    @Body() body: UpdateAgentBody,
    @Request() req: Express.Request
  ): Promise<AgentResponse> {
    const authReq = req as unknown as AuthenticatedRequest;
    if (!authReq.apiKey?.ownerId) {
      throw new ForbiddenError("Authentication required to update an agent");
    }
    const ownerId = authReq.apiKey.ownerId;
    const agent = await agentService.update(agentId, ownerId, body as Partial<CreateAgentInput>);
    return agent as AgentResponse;
  }

  /**
   * Get agent reputation history and aggregate scores.
   */
  @Get("{agentId}/reputation")
  public async getReputation(@Path() agentId: string): Promise<ReputationResponse> {
    const summary = await reputationService.getSummary(agentId);
    return summary as ReputationResponse;
  }

  /**
   * Find the best matching agents for a given capability.
   * Returns agents ranked by a weighted score of capability fit, price, reputation, response time, and uptime.
   */
  @Post("match")
  @Security("api_key", ["read"])
  public async matchAgents(
    @Body() body: { capability: string; maxPrice?: number; minReputation?: number; maxResponseMs?: number; limit?: number }
  ): Promise<MatchResponse> {
    const matches = await matchingService.findMatches(
      {
        capability: body.capability,
        maxPrice: body.maxPrice,
        minReputation: body.minReputation,
        maxResponseMs: body.maxResponseMs,
      },
      body.limit ?? 10
    );

    return {
      matches: matches.map((m) => ({
        agent: agentService.toAgentCard(m.agent),
        matchScore: Math.round(m.matchScore * 1000) / 1000,
        breakdown: m.breakdown,
      })),
      total: matches.length,
    };
  }
}
