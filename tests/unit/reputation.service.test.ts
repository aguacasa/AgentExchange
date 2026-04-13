import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

import { ReputationService } from "../../src/services/reputation.service";

describe("ReputationService", () => {
  let service: ReputationService;

  beforeEach(() => {
    service = new ReputationService();
    prismaMock.reputationEvent.create.mockResolvedValue({ id: "ev-1", score: 0 });
    prismaMock.agent.update.mockResolvedValue({});
  });

  describe("recalculateScores", () => {
    it("returns early with no events", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([]);
      await service.recalculateScores("agent-1");
      expect(prismaMock.agent.update).not.toHaveBeenCalled();
    });

    it("computes correct scores for typical agent", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { metricType: "TASK_COMPLETED", score: 1 },
        { metricType: "QUALITY_SCORE", score: 85 },
        { metricType: "RESPONSE_TIME", score: 1200 },
        { metricType: "TASK_COMPLETED", score: 1 },
        { metricType: "QUALITY_SCORE", score: 90 },
        { metricType: "RESPONSE_TIME", score: 800 },
      ]);

      await service.recalculateScores("agent-1");

      const call = prismaMock.agent.update.mock.calls[0][0];
      expect(call.where.id).toBe("agent-1");
      expect(call.data.totalTasks).toBe(2);
      expect(call.data.successRate).toBe(1); // 2/2
      expect(call.data.reputationScore).toBeGreaterThan(0);
      expect(call.data.reputationScore).toBeLessThanOrEqual(100);
    });

    it("clamps disputeRate to [0, 1] when disputes exceed tasks", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { metricType: "TASK_COMPLETED", score: 1 },
        { metricType: "DISPUTE_RAISED", score: 1 },
        { metricType: "DISPUTE_RAISED", score: 1 },
        { metricType: "DISPUTE_RAISED", score: 1 },
      ]);

      await service.recalculateScores("agent-1");

      const call = prismaMock.agent.update.mock.calls[0][0];
      // disputeRate should be clamped to 1.0, not 3/1 = 3.0
      expect(call.data.disputeRate).toBeLessThanOrEqual(1);
      expect(call.data.disputeRate).toBeGreaterThanOrEqual(0);
      // overallScore should still be non-negative
      expect(call.data.reputationScore).toBeGreaterThanOrEqual(0);
    });

    it("handles NaN in responseTime without propagating", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { metricType: "TASK_COMPLETED", score: 1 },
        { metricType: "RESPONSE_TIME", score: NaN },
        { metricType: "QUALITY_SCORE", score: 80 },
      ]);

      await service.recalculateScores("agent-1");

      const call = prismaMock.agent.update.mock.calls[0][0];
      expect(Number.isFinite(call.data.reputationScore)).toBe(true);
      expect(Number.isFinite(call.data.avgResponseMs)).toBe(true);
    });

    it("handles NaN in qualityScore without propagating", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { metricType: "TASK_COMPLETED", score: 1 },
        { metricType: "QUALITY_SCORE", score: NaN },
        { metricType: "RESPONSE_TIME", score: 500 },
      ]);

      await service.recalculateScores("agent-1");

      const call = prismaMock.agent.update.mock.calls[0][0];
      expect(Number.isFinite(call.data.reputationScore)).toBe(true);
    });

    it("responseTimeFactor stays in [0, 100] for extreme values", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { metricType: "TASK_COMPLETED", score: 1 },
        { metricType: "RESPONSE_TIME", score: 1000000 }, // 1M ms
        { metricType: "QUALITY_SCORE", score: 50 },
      ]);

      await service.recalculateScores("agent-1");

      const call = prismaMock.agent.update.mock.calls[0][0];
      expect(call.data.reputationScore).toBeGreaterThanOrEqual(0);
      expect(call.data.reputationScore).toBeLessThanOrEqual(100);
    });

    it("score is 0 when all events are failures", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { metricType: "TASK_FAILED", score: 0 },
        { metricType: "QUALITY_SCORE", score: 0 },
        { metricType: "RESPONSE_TIME", score: 0 },
      ]);

      await service.recalculateScores("agent-1");

      const call = prismaMock.agent.update.mock.calls[0][0];
      expect(call.data.successRate).toBe(0);
      expect(call.data.reputationScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("recordTaskCompletion", () => {
    it("creates 3 events for a successful task", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([]);

      await service.recordTaskCompletion("agent-1", "task-1", true, 500, 90);

      expect(prismaMock.reputationEvent.create).toHaveBeenCalledTimes(3);
      const types = prismaMock.reputationEvent.create.mock.calls.map(
        (c: any) => c[0].data.metricType
      );
      expect(types).toContain("TASK_COMPLETED");
      expect(types).toContain("RESPONSE_TIME");
      expect(types).toContain("QUALITY_SCORE");
    });

    it("creates TASK_FAILED event for failed task", async () => {
      prismaMock.reputationEvent.findMany.mockResolvedValue([]);

      await service.recordTaskCompletion("agent-1", "task-1", false, 0, 0);

      const firstCall = prismaMock.reputationEvent.create.mock.calls[0][0];
      expect(firstCall.data.metricType).toBe("TASK_FAILED");
    });
  });

  describe("getSummary", () => {
    it("returns correct structure", async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        reputationScore: 85,
        totalTasks: 10,
        successRate: 0.9,
        avgResponseMs: 500,
        disputeRate: 0.1,
      });
      prismaMock.reputationEvent.findMany.mockResolvedValue([]);

      const summary = await service.getSummary("agent-1");

      expect(summary.agentId).toBe("agent-1");
      expect(summary.overallScore).toBe(85);
      expect(summary.totalTasks).toBe(10);
    });

    it("throws when agent not found", async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);
      prismaMock.reputationEvent.findMany.mockResolvedValue([]);

      await expect(service.getSummary("missing")).rejects.toThrow("Agent not found");
    });
  });
});
