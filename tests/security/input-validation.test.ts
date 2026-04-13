import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));
vi.mock("../../src/services/escrow.service", () => ({
  escrowService: { holdFunds: vi.fn().mockResolvedValue({}) },
}));
vi.mock("../../src/services/reputation.service", () => ({
  reputationService: { recordTaskCompletion: vi.fn(), recordEvent: vi.fn() },
}));

import { TaskService } from "../../src/services/task.service";
import { AgentService } from "../../src/services/agent.service";

describe("Input Validation", () => {
  describe("Task price validation", () => {
    const service = new TaskService();
    const base = {
      buyerAgentId: "b-1",
      capabilityRequested: "review",
      inputSchema: { type: "object" },
    };

    it.each([
      [0, "zero"],
      [-100, "negative"],
      [NaN, "NaN"],
      [Infinity, "Infinity"],
      [-Infinity, "-Infinity"],
    ])("rejects price=%s (%s)", async (price) => {
      await expect(service.create({ ...base, price })).rejects.toThrow(/[Pp]rice/);
    });

    it("rejects non-integer price", async () => {
      await expect(service.create({ ...base, price: 99.5 })).rejects.toThrow("integer");
    });

    it("accepts valid integer price", async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: "b-1" });
      prismaMock.taskContract.create.mockResolvedValue({ id: "t-1", price: 100 });
      // Should not throw
      await service.create({ ...base, price: 100 });
    });
  });

  describe("Task timeout validation", () => {
    const service = new TaskService();
    const base = {
      buyerAgentId: "b-1",
      capabilityRequested: "review",
      inputSchema: { type: "object" },
      price: 100,
    };

    it.each([
      [0, "zero"],
      [-1, "negative"],
      [NaN, "NaN"],
      [Infinity, "Infinity"],
    ])("rejects timeoutMs=%s (%s)", async (timeoutMs) => {
      await expect(service.create({ ...base, timeoutMs })).rejects.toThrow(/timeoutMs/);
    });

    it("rejects timeoutMs exceeding 24 hours", async () => {
      await expect(service.create({ ...base, timeoutMs: 86400001 })).rejects.toThrow("24 hours");
    });
  });

  describe("Agent validation", () => {
    const service = new AgentService();
    const base = {
      name: "Agent",
      ownerId: "o-1",
      endpointUrl: "https://example.com",
      capabilities: ["review"],
    };

    it("rejects empty name", async () => {
      await expect(service.create({ ...base, name: "" })).rejects.toThrow("name is required");
    });

    it("rejects empty endpointUrl", async () => {
      await expect(service.create({ ...base, endpointUrl: "" })).rejects.toThrow("Endpoint URL is required");
    });

    it("rejects empty capabilities array", async () => {
      await expect(service.create({ ...base, capabilities: [] })).rejects.toThrow("At least one capability");
    });

    it("rejects empty string in capabilities", async () => {
      await expect(service.create({ ...base, capabilities: [""] })).rejects.toThrow("non-empty string");
    });

    it("rejects negative pricePerUnit", async () => {
      await expect(service.create({ ...base, pricePerUnit: -50 })).rejects.toThrow("non-negative");
    });

    it("rejects NaN pricePerUnit", async () => {
      await expect(service.create({ ...base, pricePerUnit: NaN })).rejects.toThrow("non-negative");
    });
  });

  describe("Task submit validation", () => {
    const service = new TaskService();

    it("rejects null outputData", async () => {
      await expect(service.submit("t-1", "s-1", null as any)).rejects.toThrow("non-empty object");
    });

    it("rejects empty object outputData", async () => {
      await expect(service.submit("t-1", "s-1", {} as any)).rejects.toThrow("non-empty object");
    });
  });
});
