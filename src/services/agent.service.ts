import prisma from "../utils/prisma";
import { generateApiKey } from "../utils/hash";
import { NotFoundError, ValidationError } from "../utils/errors";
import { clampPagination } from "../utils/pagination";
import { Agent, AgentStatus, PricingModel, AuthMethod } from "../types/domain";

export interface CreateAgentInput {
  name: string;
  description?: string;
  ownerId: string;
  endpointUrl: string;
  capabilities: string[];
  pricingModel?: PricingModel;
  pricePerUnit?: number;
  currency?: string;
  slaResponseMs?: number;
  slaUptimePct?: number;
  authMethod?: AuthMethod;
  metadata?: Record<string, unknown>;
  sampleInput?: Record<string, unknown>;
  sampleOutput?: Record<string, unknown>;
}

export interface SearchAgentsInput {
  capability?: string;
  minPrice?: number;
  maxPrice?: number;
  minReputation?: number;
  status?: AgentStatus;
  limit?: number;
  offset?: number;
}

export interface AgentWithApiKey {
  agent: Agent;
  apiKey: string; // only returned on creation
}

export class AgentService {
  async create(input: CreateAgentInput): Promise<AgentWithApiKey> {
    if (!input.name || input.name.trim() === "") {
      throw new ValidationError("Agent name is required");
    }
    if (!input.endpointUrl || input.endpointUrl.trim() === "") {
      throw new ValidationError("Endpoint URL is required");
    }
    // Validate URL format and require HTTPS
    try {
      const parsed = new URL(input.endpointUrl);
      if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new ValidationError("Endpoint URL must use HTTPS (or HTTP for local development)");
      }
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError("Endpoint URL must be a valid URL");
    }
    if (!input.capabilities?.length) {
      throw new ValidationError("At least one capability is required");
    }
    for (const cap of input.capabilities) {
      if (typeof cap !== "string" || cap.trim() === "") {
        throw new ValidationError("Each capability must be a non-empty string");
      }
    }
    if (input.pricePerUnit !== undefined && (!Number.isFinite(input.pricePerUnit) || input.pricePerUnit < 0)) {
      throw new ValidationError("pricePerUnit must be a non-negative finite number");
    }

    const { key, prefix, hash } = generateApiKey();

    const agent = await prisma.agent.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: input.ownerId,
        endpointUrl: input.endpointUrl,
        capabilities: input.capabilities,
        pricingModel: input.pricingModel ?? "PER_TASK",
        pricePerUnit: input.pricePerUnit ?? 0,
        currency: input.currency ?? "USD",
        slaResponseMs: input.slaResponseMs,
        slaUptimePct: input.slaUptimePct,
        authMethod: input.authMethod ?? "API_KEY",
        metadata: input.metadata,
        sampleInput: input.sampleInput,
        sampleOutput: input.sampleOutput,
        apiKeys: {
          create: {
            ownerId: input.ownerId,
            keyHash: hash,
            keyPrefix: prefix,
            label: "default",
            scopes: ["read", "write"],
          },
        },
      },
    });

    return { agent, apiKey: key };
  }

  async getById(id: string): Promise<Agent> {
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundError("Agent", id);
    return agent;
  }

  async search(input: SearchAgentsInput): Promise<{ agents: Agent[]; total: number }> {
    const where: Record<string, unknown> = {
      status: input.status ?? "ACTIVE",
    };

    if (input.capability) {
      where.capabilities = { has: input.capability };
    }
    if (input.minPrice !== undefined || input.maxPrice !== undefined) {
      where.pricePerUnit = {
        ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
        ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
      };
    }
    if (input.minReputation !== undefined) {
      where.reputationScore = { gte: input.minReputation };
    }

    const { take, skip } = clampPagination(input.limit, input.offset);

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: where as any,
        orderBy: { reputationScore: "desc" },
        take,
        skip,
      }),
      prisma.agent.count({ where: where as any }),
    ]);

    return { agents, total };
  }

  async update(id: string, ownerId: string, data: Partial<CreateAgentInput>): Promise<Agent> {
    const agent = await this.getById(id);
    if (agent.ownerId !== ownerId) {
      throw new ValidationError("You can only update your own agents");
    }

    return prisma.agent.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.endpointUrl && { endpointUrl: data.endpointUrl }),
        ...(data.capabilities && { capabilities: data.capabilities }),
        ...(data.pricingModel && { pricingModel: data.pricingModel }),
        ...(data.pricePerUnit !== undefined && { pricePerUnit: data.pricePerUnit }),
        ...(data.slaResponseMs !== undefined && { slaResponseMs: data.slaResponseMs }),
        ...(data.slaUptimePct !== undefined && { slaUptimePct: data.slaUptimePct }),
        ...(data.authMethod && { authMethod: data.authMethod }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.sampleInput !== undefined && { sampleInput: data.sampleInput }),
        ...(data.sampleOutput !== undefined && { sampleOutput: data.sampleOutput }),
      },
    });
  }

  toAgentCard(agent: Agent): Record<string, unknown> {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      url: agent.endpointUrl,
      capabilities: agent.capabilities.map((c) => ({
        name: c,
        description: `Capability: ${c}`,
      })),
      pricing: {
        model: agent.pricingModel,
        pricePerUnit: agent.pricePerUnit,
        currency: agent.currency,
      },
      sla: {
        maxResponseTimeMs: agent.slaResponseMs,
        uptimePercentage: agent.slaUptimePct,
      },
      authentication: {
        method: agent.authMethod,
      },
      reputation: {
        score: agent.reputationScore,
        totalTasks: agent.totalTasks,
        successRate: agent.successRate,
        avgResponseMs: agent.avgResponseMs,
        disputeRate: agent.disputeRate,
      },
      metadata: agent.metadata,
      sampleInput: agent.sampleInput,
      sampleOutput: agent.sampleOutput,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}

export const agentService = new AgentService();
