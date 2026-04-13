import prisma from "../utils/prisma";
import { ReputationEvent, MetricType } from "../types/domain";

// Exponential Moving Average decay factor (0-1)
const EMA_ALPHA = 0.3;

export interface ReputationSummary {
  agentId: string;
  overallScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  recentEvents: ReputationEvent[];
}

export class ReputationService {
  async recordEvent(
    agentId: string,
    taskContractId: string | null,
    metricType: MetricType,
    score: number,
    metadata?: Record<string, unknown>
  ): Promise<ReputationEvent> {
    const event = await prisma.reputationEvent.create({
      data: {
        agentId,
        taskContractId,
        metricType,
        score: Number.isFinite(score) ? score : 0,
        metadata: metadata ?? undefined,
      },
    });

    await this.recalculateScores(agentId);
    return event as unknown as ReputationEvent;
  }

  async recordTaskCompletion(
    agentId: string,
    taskContractId: string,
    succeeded: boolean,
    responseTimeMs: number,
    qualityScore: number
  ): Promise<void> {
    await this.recordEvent(
      agentId, taskContractId,
      succeeded ? "TASK_COMPLETED" : "TASK_FAILED",
      succeeded ? 1 : 0
    );
    await this.recordEvent(agentId, taskContractId, "RESPONSE_TIME", responseTimeMs);
    await this.recordEvent(agentId, taskContractId, "QUALITY_SCORE", qualityScore);
  }

  async recalculateScores(agentId: string): Promise<void> {
    const events = await prisma.reputationEvent.findMany({
      where: { agentId },
      orderBy: { createdAt: "asc" },
    });

    if (events.length === 0) return;

    let completedCount = 0;
    let failedCount = 0;
    let disputeCount = 0;
    let responseTimeEma = 0;
    let qualityEma = 0;
    let hasResponseTime = false;
    let hasQuality = false;

    for (const event of events) {
      // NaN guard — skip invalid scores
      const score = Number.isFinite(event.score) ? event.score : 0;

      switch (event.metricType) {
        case "TASK_COMPLETED":
          completedCount++;
          break;
        case "TASK_FAILED":
          failedCount++;
          break;
        case "DISPUTE_RAISED":
          disputeCount++;
          break;
        case "RESPONSE_TIME":
          responseTimeEma = hasResponseTime
            ? EMA_ALPHA * score + (1 - EMA_ALPHA) * responseTimeEma
            : score;
          hasResponseTime = true;
          break;
        case "QUALITY_SCORE":
          qualityEma = hasQuality
            ? EMA_ALPHA * score + (1 - EMA_ALPHA) * qualityEma
            : score;
          hasQuality = true;
          break;
      }
    }

    const totalTasks = completedCount + failedCount;
    const successRate = totalTasks > 0 ? completedCount / totalTasks : 0;
    // Clamp disputeRate to [0, 1] — disputes can exceed task count
    const disputeRate = totalTasks > 0 ? Math.min(1, Math.max(0, disputeCount / totalTasks)) : 0;

    // NaN-safe values
    const safeResponseTimeEma = Number.isFinite(responseTimeEma) ? responseTimeEma : 0;
    const safeQualityEma = Number.isFinite(qualityEma) ? qualityEma : 0;

    // Clamp responseTimeFactor to [0, 100]
    const responseTimeFactor = hasResponseTime
      ? Math.max(0, Math.min(100, 100 - safeResponseTimeEma / 100))
      : 50;

    // Overall reputation score (0-100):
    // 50% quality, 25% success rate, 15% response time (inverted), 10% dispute rate (inverted)
    const rawScore =
      safeQualityEma * 0.50 +
      successRate * 100 * 0.25 +
      responseTimeFactor * 0.15 +
      (1 - disputeRate) * 100 * 0.10;

    const overallScore = Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, rawScore))
      : 0;

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        reputationScore: Math.round(overallScore * 100) / 100,
        totalTasks,
        successRate: Math.round(successRate * 1000) / 1000,
        avgResponseMs: Math.round(safeResponseTimeEma),
        disputeRate: Math.round(disputeRate * 1000) / 1000,
      },
    });
  }

  async getSummary(agentId: string): Promise<ReputationSummary> {
    const [agent, recentEvents] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentId } }),
      prisma.reputationEvent.findMany({
        where: { agentId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    return {
      agentId,
      overallScore: agent.reputationScore,
      totalTasks: agent.totalTasks,
      successRate: agent.successRate,
      avgResponseMs: agent.avgResponseMs,
      disputeRate: agent.disputeRate,
      recentEvents: recentEvents as unknown as ReputationEvent[],
    };
  }
}

export const reputationService = new ReputationService();
