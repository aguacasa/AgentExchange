import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

import { MatchingService } from "../../src/services/matching.service";

function mockAgent(overrides: Partial<any> = {}) {
  return {
    id: "a-1",
    name: "TestAgent",
    capabilities: ["code-review"],
    pricePerUnit: 200,
    reputationScore: 80,
    avgResponseMs: 500,
    slaUptimePct: 99.5,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("MatchingService", () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
  });

  it("returns empty array when no candidates found", async () => {
    prismaMock.agent.findMany.mockResolvedValue([]);
    const result = await service.findMatches({ capability: "nonexistent" });
    expect(result).toEqual([]);
  });

  it("returns ranked agents sorted by matchScore descending", async () => {
    prismaMock.agent.findMany.mockResolvedValue([
      mockAgent({ id: "a-1", reputationScore: 50, pricePerUnit: 500 }),
      mockAgent({ id: "a-2", reputationScore: 95, pricePerUnit: 100 }),
      mockAgent({ id: "a-3", reputationScore: 70, pricePerUnit: 300 }),
    ]);

    const result = await service.findMatches({ capability: "code-review" });

    expect(result.length).toBe(3);
    // Highest reputation + lowest price should rank first
    expect(result[0].agent.id).toBe("a-2");
    // Scores should be descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].matchScore).toBeGreaterThanOrEqual(result[i].matchScore);
    }
  });

  it("all candidates have capabilityScore of 1.0", async () => {
    prismaMock.agent.findMany.mockResolvedValue([mockAgent()]);

    const result = await service.findMatches({ capability: "code-review" });

    expect(result[0].breakdown.capabilityScore).toBe(1.0);
  });

  it("single candidate gets 1.0 for normalized scores (span=0)", async () => {
    prismaMock.agent.findMany.mockResolvedValue([mockAgent()]);

    const result = await service.findMatches({ capability: "code-review" });

    expect(result[0].breakdown.priceScore).toBe(1.0);
    expect(result[0].breakdown.responseTimeScore).toBe(1.0);
  });

  it("respects limit parameter", async () => {
    prismaMock.agent.findMany.mockResolvedValue([
      mockAgent({ id: "a-1" }),
      mockAgent({ id: "a-2" }),
      mockAgent({ id: "a-3" }),
    ]);

    const result = await service.findMatches({ capability: "code-review" }, 2);
    expect(result.length).toBe(2);
  });

  it("handles null slaUptimePct (defaults to 99)", async () => {
    prismaMock.agent.findMany.mockResolvedValue([
      mockAgent({ slaUptimePct: null }),
    ]);

    const result = await service.findMatches({ capability: "code-review" });
    expect(result[0].breakdown.uptimeScore).toBe(0.99);
  });

  it("matchScore components sum correctly with weights", async () => {
    prismaMock.agent.findMany.mockResolvedValue([mockAgent()]);

    const result = await service.findMatches({ capability: "code-review" });
    const b = result[0].breakdown;

    const expected =
      b.capabilityScore * 0.30 +
      b.priceScore * 0.15 +
      b.reputationScore * 0.30 +
      b.responseTimeScore * 0.15 +
      b.uptimeScore * 0.10;

    expect(result[0].matchScore).toBeCloseTo(expected, 5);
  });
});
