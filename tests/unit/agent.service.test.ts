import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

import { AgentService } from "../../src/services/agent.service";

describe("AgentService", () => {
  let service: AgentService;

  const validInput = {
    name: "TestAgent",
    ownerId: "owner-1",
    endpointUrl: "https://api.example.com/agent",
    capabilities: ["code-review"],
    pricePerUnit: 200,
  };

  beforeEach(() => {
    service = new AgentService();
    prismaMock.agent.create.mockResolvedValue({
      id: "a-1",
      ...validInput,
      pricingModel: "PER_TASK",
      currency: "USD",
      authMethod: "API_KEY",
      status: "ACTIVE",
      reputationScore: 0,
      totalTasks: 0,
      successRate: 0,
      avgResponseMs: 0,
      disputeRate: 0,
    });
  });

  describe("create", () => {
    it("creates agent and returns agent + API key", async () => {
      const result = await service.create(validInput);
      expect(result.agent.id).toBe("a-1");
      expect(result.apiKey).toMatch(/^cb_/);
      expect(prismaMock.agent.create).toHaveBeenCalled();
    });

    it("rejects empty capabilities", async () => {
      await expect(service.create({ ...validInput, capabilities: [] }))
        .rejects.toThrow("At least one capability is required");
    });

    it("rejects capabilities containing empty strings", async () => {
      await expect(service.create({ ...validInput, capabilities: ["", "valid"] }))
        .rejects.toThrow("Each capability must be a non-empty string");
    });

    it("rejects whitespace-only capabilities", async () => {
      await expect(service.create({ ...validInput, capabilities: ["  "] }))
        .rejects.toThrow("Each capability must be a non-empty string");
    });

    it("rejects missing name", async () => {
      await expect(service.create({ ...validInput, name: "" }))
        .rejects.toThrow("Agent name is required");
    });

    it("rejects missing endpointUrl", async () => {
      await expect(service.create({ ...validInput, endpointUrl: "" }))
        .rejects.toThrow("Endpoint URL is required");
    });

    it("rejects negative pricePerUnit", async () => {
      await expect(service.create({ ...validInput, pricePerUnit: -100 }))
        .rejects.toThrow("pricePerUnit must be a non-negative finite number");
    });

    it("rejects NaN pricePerUnit", async () => {
      await expect(service.create({ ...validInput, pricePerUnit: NaN }))
        .rejects.toThrow("pricePerUnit must be a non-negative finite number");
    });

    it("allows zero pricePerUnit", async () => {
      const result = await service.create({ ...validInput, pricePerUnit: 0 });
      expect(result.agent).toBeDefined();
    });
  });

  describe("getById", () => {
    it("returns agent when found", async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: "a-1", name: "Test" });
      const agent = await service.getById("a-1");
      expect(agent.id).toBe("a-1");
    });

    it("throws NotFoundError when not found", async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);
      await expect(service.getById("missing")).rejects.toThrow("Agent not found");
    });
  });

  describe("search", () => {
    it("defaults status to ACTIVE", async () => {
      prismaMock.agent.findMany.mockResolvedValue([]);
      prismaMock.agent.count.mockResolvedValue(0);

      await service.search({});

      const where = prismaMock.agent.findMany.mock.calls[0][0].where;
      expect(where.status).toBe("ACTIVE");
    });

    it("filters by capability", async () => {
      prismaMock.agent.findMany.mockResolvedValue([]);
      prismaMock.agent.count.mockResolvedValue(0);

      await service.search({ capability: "translation" });

      const where = prismaMock.agent.findMany.mock.calls[0][0].where;
      expect(where.capabilities).toEqual({ has: "translation" });
    });

    it("filters by price range", async () => {
      prismaMock.agent.findMany.mockResolvedValue([]);
      prismaMock.agent.count.mockResolvedValue(0);

      await service.search({ minPrice: 100, maxPrice: 500 });

      const where = prismaMock.agent.findMany.mock.calls[0][0].where;
      expect(where.pricePerUnit).toEqual({ gte: 100, lte: 500 });
    });
  });

  describe("update", () => {
    it("throws when ownerId doesn't match", async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: "a-1", ownerId: "owner-1" });

      await expect(service.update("a-1", "wrong-owner", { name: "New" }))
        .rejects.toThrow("You can only update your own agents");
    });

    it("updates specified fields", async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: "a-1", ownerId: "owner-1" });
      prismaMock.agent.update.mockResolvedValue({ id: "a-1", name: "Updated" });

      const result = await service.update("a-1", "owner-1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });
});
