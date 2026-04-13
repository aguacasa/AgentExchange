import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

const { mockEscrow } = vi.hoisted(() => ({
  mockEscrow: {
    holdFunds: vi.fn(),
    releaseFunds: vi.fn(),
    refundFunds: vi.fn(),
    freezeFunds: vi.fn(),
  },
}));

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));
vi.mock("../../src/services/escrow.service", () => ({ escrowService: mockEscrow }));

import { TaskService } from "../../src/services/task.service";

describe("Task Lifecycle Integration", () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
    mockEscrow.holdFunds.mockResolvedValue({});
    mockEscrow.releaseFunds.mockResolvedValue({});
    mockEscrow.refundFunds.mockResolvedValue({});
    mockEscrow.freezeFunds.mockResolvedValue({});

    prismaMock.reputationEvent.create.mockResolvedValue({ id: "ev-1" });
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.agent.update.mockResolvedValue({});
  });

  describe("Happy path: create -> accept -> submit -> verify(pass)", () => {
    it("completes full lifecycle with escrow released", async () => {
      // Step 1: Create task
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "buyer-1" });
      prismaMock.taskContract.create.mockResolvedValueOnce({
        id: "task-1",
        buyerAgentId: "buyer-1",
        price: 500,
        currency: "USD",
        status: "OPEN",
        capabilityRequested: "code-review",
        expiresAt: new Date(Date.now() + 300000),
      });

      const created = await taskService.create({
        buyerAgentId: "buyer-1",
        capabilityRequested: "code-review",
        inputSchema: { type: "object" },
        price: 500,
      });
      expect(created.status).toBe("OPEN");
      expect(mockEscrow.holdFunds).toHaveBeenCalledWith("task-1", 500, "USD");

      // Step 2: Accept
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        ...created,
        status: "OPEN",
        expiresAt: new Date(Date.now() + 300000),
      });
      prismaMock.agent.findUnique.mockResolvedValueOnce({
        id: "seller-1",
        capabilities: ["code-review"],
      });
      prismaMock.taskContract.update.mockResolvedValueOnce({
        ...created,
        sellerAgentId: "seller-1",
        status: "IN_PROGRESS",
        acceptedAt: new Date("2025-01-01T00:00:00Z"),
      });

      const accepted = await taskService.accept("task-1", "seller-1");
      expect(accepted.status).toBe("IN_PROGRESS");

      // Step 3: Submit
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        ...accepted,
        status: "IN_PROGRESS",
        sellerAgentId: "seller-1",
      });
      prismaMock.taskContract.update.mockResolvedValueOnce({
        ...accepted,
        status: "SUBMITTED",
        submittedAt: new Date("2025-01-01T00:01:00Z"),
      });

      const submitted = await taskService.submit("task-1", "seller-1", { result: "lgtm" });
      expect(submitted.status).toBe("SUBMITTED");

      // Step 4: Verify (pass)
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        ...submitted,
        status: "SUBMITTED",
        sellerAgentId: "seller-1",
        acceptedAt: new Date("2025-01-01T00:00:00Z"),
        submittedAt: new Date("2025-01-01T00:01:00Z"),
      });
      prismaMock.taskContract.update.mockResolvedValueOnce({
        ...submitted,
        status: "COMPLETED",
        completedAt: new Date(),
      });

      const completed = await taskService.verify("task-1", true, { qualityScore: 95 });
      expect(completed.status).toBe("COMPLETED");
      expect(mockEscrow.releaseFunds).toHaveBeenCalledWith("task-1");
    });
  });

  describe("Failure path: create -> accept -> submit -> verify(fail)", () => {
    it("refunds escrow on verification failure", async () => {
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "buyer-1" });
      prismaMock.taskContract.create.mockResolvedValueOnce({
        id: "task-2",
        buyerAgentId: "buyer-1",
        price: 300,
        currency: "USD",
        status: "OPEN",
        capabilityRequested: "translation",
        expiresAt: new Date(Date.now() + 300000),
      });

      await taskService.create({
        buyerAgentId: "buyer-1",
        capabilityRequested: "translation",
        inputSchema: { type: "object" },
        price: 300,
      });

      // Directly test verify(fail)
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        id: "task-2",
        sellerAgentId: "seller-1",
        status: "SUBMITTED",
        acceptedAt: new Date(),
        submittedAt: new Date(),
      });
      prismaMock.taskContract.update.mockResolvedValueOnce({ id: "task-2", status: "FAILED" });

      const failed = await taskService.verify("task-2", false);
      expect(failed.status).toBe("FAILED");
      expect(mockEscrow.refundFunds).toHaveBeenCalledWith("task-2");
    });
  });

  describe("Dispute path: create -> dispute -> resolve", () => {
    it("freezes then refunds escrow on resolution", async () => {
      const task = {
        id: "task-3",
        buyerAgentId: "buyer-1",
        sellerAgentId: "seller-1",
        status: "SUBMITTED",
        capabilityRequested: "analysis",
      };

      // Dispute
      prismaMock.taskContract.findUnique.mockResolvedValueOnce(task);
      prismaMock.taskContract.update.mockResolvedValueOnce({ ...task, status: "DISPUTED" });

      const disputed = await taskService.dispute("task-3", "bad quality");
      expect(disputed.status).toBe("DISPUTED");
      expect(mockEscrow.freezeFunds).toHaveBeenCalledWith("task-3", "bad quality");

      // Resolve — refund to buyer
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({ ...task, status: "DISPUTED" });
      prismaMock.taskContract.update.mockResolvedValueOnce({ ...task, status: "FAILED" });

      const resolved = await taskService.resolveDispute("task-3", "refund_to_buyer", "buyer right");
      expect(resolved.status).toBe("FAILED");
      expect(mockEscrow.refundFunds).toHaveBeenCalledWith("task-3");
    });
  });

  describe("Invalid transitions", () => {
    it("cannot accept non-OPEN task (race condition)", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        id: "t",
        status: "OPEN",
        buyerAgentId: "b",
        expiresAt: new Date(Date.now() + 300000),
        capabilityRequested: "review",
      });
      prismaMock.agent.findUnique.mockResolvedValueOnce({
        id: "s",
        capabilities: ["review"],
      });
      // Simulate race: another request already changed the status
      prismaMock.taskContract.update.mockRejectedValueOnce({ code: "P2025" });

      await expect(taskService.accept("t", "s")).rejects.toThrow("no longer open");
    });

    it("cannot verify non-SUBMITTED task", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({ id: "t", status: "OPEN" });
      await expect(taskService.verify("t", true)).rejects.toThrow("not submitted");
    });

    it("cannot dispute COMPLETED task", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({ id: "t", status: "COMPLETED" });
      await expect(taskService.dispute("t", "reason")).rejects.toThrow("Cannot dispute");
    });

    it("cannot resolve non-DISPUTED task", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({ id: "t", status: "SUBMITTED" });
      await expect(taskService.resolveDispute("t", "release_to_seller")).rejects.toThrow("not disputed");
    });
  });
});
