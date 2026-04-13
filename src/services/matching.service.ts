import prisma from "../utils/prisma";
import { Agent } from "../types/domain";

export interface MatchCriteria {
  capability: string;
  maxPrice?: number;
  minReputation?: number;
  maxResponseMs?: number;
}

export interface RankedAgent {
  agent: Agent;
  matchScore: number;
  breakdown: {
    capabilityScore: number;
    priceScore: number;
    reputationScore: number;
    responseTimeScore: number;
    uptimeScore: number;
  };
}

// Weights for the ranking algorithm (sum to 1.0)
const WEIGHTS = {
  capability: 0.30,
  price: 0.15,
  reputation: 0.30,
  responseTime: 0.15,
  uptime: 0.10,
};

export class MatchingService {
  async findMatches(criteria: MatchCriteria, limit = 10): Promise<RankedAgent[]> {
    // Step 1: Filter candidates from DB
    const where: Record<string, unknown> = {
      status: "ACTIVE",
      capabilities: { has: criteria.capability },
    };

    if (criteria.maxPrice !== undefined) {
      where.pricePerUnit = { lte: criteria.maxPrice };
    }
    if (criteria.minReputation !== undefined) {
      where.reputationScore = { gte: criteria.minReputation };
    }
    if (criteria.maxResponseMs !== undefined) {
      where.slaResponseMs = { lte: criteria.maxResponseMs };
    }

    const candidates: Agent[] = await prisma.agent.findMany({
      where: where as any,
      take: 100, // score top 100, return top N
    });

    if (candidates.length === 0) return [];

    // Step 2: Score and rank
    const priceRange = this.getRange(candidates.map((a) => a.pricePerUnit));
    const responseRange = this.getRange(candidates.map((a) => a.avgResponseMs));

    const ranked: RankedAgent[] = candidates.map((agent) => {
      const breakdown = {
        // Capability: exact match = 1.0 (already filtered, so all match)
        capabilityScore: 1.0,

        // Price: lower is better (normalize inversely)
        priceScore: priceRange.span > 0
          ? 1 - (agent.pricePerUnit - priceRange.min) / priceRange.span
          : 1.0,

        // Reputation: higher is better (0-100 scale)
        reputationScore: agent.reputationScore / 100,

        // Response time: lower is better
        responseTimeScore: responseRange.span > 0
          ? 1 - (agent.avgResponseMs - responseRange.min) / responseRange.span
          : 1.0,

        // Uptime: direct percentage
        uptimeScore: (agent.slaUptimePct ?? 99) / 100,
      };

      const matchScore =
        breakdown.capabilityScore * WEIGHTS.capability +
        breakdown.priceScore * WEIGHTS.price +
        breakdown.reputationScore * WEIGHTS.reputation +
        breakdown.responseTimeScore * WEIGHTS.responseTime +
        breakdown.uptimeScore * WEIGHTS.uptime;

      return { agent, matchScore, breakdown };
    });

    ranked.sort((a, b) => b.matchScore - a.matchScore);
    return ranked.slice(0, limit);
  }

  private getRange(values: number[]): { min: number; max: number; span: number } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max, span: max - min };
  }
}

export const matchingService = new MatchingService();
