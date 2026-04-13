import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

const { mockEscrow, mockReputation } = vi.hoisted(() => ({
  mockEscrow: {
    holdFunds: vi.fn(),
    releaseFunds: vi.fn(),
    refundFunds: vi.fn(),
    freezeFunds: vi.fn(),
  },
  mockReputation: {
    recordTaskCompletion: vi.fn(),
    recordEvent: vi.fn(),
  },
}));

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));
vi.mock("../../src/services/escrow.service", () => ({ escrowService: mockEscrow }));
vi.mock("../../src/services/reputation.service", () => ({ reputationService: mockReputation }));

import { TaskService } from "../../src/services/task.service";

describe("TaskService", () => {
  let service: TaskService;

  const validCreateInput = {
    buyerAgentId: "buyer-1",
    capabilityRequested: "code-review",
    inputSchema: { type: "object" },
    price: 500,
    currency: "USD",
  };

  const mockTask = {
    id: "task-1",
    buyerAgentId: "buyer-1",
    sellerAgentId: null,
    capabilityRequested: "code-review",
    price: 500,
    currency: "USD",
    status: "OPEN",
    timeoutMs: 300000,
    expiresAt: new Date(Date.now() + 300000),
    acceptedAt: null,
    submittedAt: null,
    completedAt: null,
  };

  beforeEach(() => {
    service = new TaskService();
    mockEscrow.holdFunds.mockReset();
    mockEscrow.releaseFunds.mockReset();
    mockEscrow.refundFunds.mockReset();
    mockEscrow.freezeFunds.mockReset();
    mockReputation.recordTaskCompletion.mockReset();
    mockReputation.recordEvent.mockReset();
    mockEscrow.holdFunds.mockResolvedValue({});
    mockEscrow.releaseFunds.mockResolvedValue({});
    mockEscrow.refundFunds.mockResolvedValue({});
    mockEscrow.freezeFunds.mockResolvedValue({});
    mockReputation.recordTaskCompletion.mockResolvedValue(undefined);
    mockReputation.recordEvent.mockResolvedValue({});
  });

  // ─── create ────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates task and holds escrow", async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: "buyer-1" });
      prismaMock.taskContract.create.mockResolvedValue(mockTask);

      const task = await service.create(validCreateInput);

      expect(task.id).toBe("task-1");
      expect(mockEscrow.holdFunds).toHaveBeenCalledWith("task-1", 500, "USD");
    });

    it("throws NotFoundError when buyer agent doesn't exist", async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);
      await expect(service.create(validCreateInput)).rejects.toThrow("Agent not found");
    });

    it("rejects price <= 0", async () => {
      await expect(service.create({ ...validCreateInput, price: 0 }))
        .rejects.toThrow("Price must be a positive");
    });

    it("rejects negative price", async () => {
      await expect(service.create({ ...validCreateInput, price: -100 }))
        .rejects.toThrow("Price must be a positive");
    });

    it("rejects NaN price", async () => {
      await expect(service.create({ ...validCreateInput, price: NaN }))
        .rejects.toThrow("Price must be a positive");
    });

    it("rejects Infinity price", async () => {
      await expect(service.create({ ...validCreateInput, price: Infinity }))
        .rejects.toThrow("Price must be a positive");
    });

    it("rejects non-integer price", async () => {
      await expect(service.create({ ...validCreateInput, price: 99.5 }))
        .rejects.toThrow("Price must be an integer");
    });

    it("rejects empty capabilityRequested", async () => {
      await expect(service.create({ ...validCreateInput, capabilityRequested: "" }))
        .rejects.toThrow("capabilityRequested must be a non-empty string");
    });

    it("rejects whitespace capabilityRequested", async () => {
      await expect(service.create({ ...validCreateInput, capabilityRequested: "   " }))
        .rejects.toThrow("capabilityRequested must be a non-empty string");
    });

    it("rejects timeoutMs <= 0", async () => {
      await expect(service.create({ ...validCreateInput, timeoutMs: 0 }))
        .rejects.toThrow("timeoutMs must be a positive");
    });

    it("rejects timeoutMs > 24 hours", async () => {
      await expect(service.create({ ...validCreateInput, timeoutMs: 86400001 }))
        .rejects.toThrow("timeoutMs cannot exceed 24 hours");
    });
  });

  // ─── accept ────────────────────────────────────────────────────────────

  describe("accept", () => {
    it("transitions OPEN task to IN_PROGRESS", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(mockTask);
      prismaMock.agent.findUnique.mockResolvedValue({
        id: "seller-1",
        capabilities: ["code-review"],
      });
      prismaMock.taskContract.update.mockResolvedValue({
        ...mockTask,
        sellerAgentId: "seller-1",
        status: "IN_PROGRESS",
      });

      const task = await service.accept("task-1", "seller-1");
      expect(task.status).toBe("IN_PROGRESS");
    });

    it("rejects expired task", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue({
        ...mockTask,
        expiresAt: new Date("2020-01-01"),
      });
      prismaMock.taskContract.update.mockResolvedValue({});

      await expect(service.accept("task-1", "seller-1")).rejects.toThrow("Task has expired");
    });

    it("rejects self-acceptance", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(mockTask);

      await expect(service.accept("task-1", "buyer-1"))
        .rejects.toThrow("cannot accept its own task");
    });

    it("rejects seller without required capability", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(mockTask);
      prismaMock.agent.findUnique.mockResolvedValue({
        id: "seller-1",
        capabilities: ["translation"], // wrong capability
      });

      await expect(service.accept("task-1", "seller-1"))
        .rejects.toThrow("does not have capability");
    });

    it("handles P2025 race condition gracefully", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(mockTask);
      prismaMock.agent.findUnique.mockResolvedValue({
        id: "seller-1",
        capabilities: ["code-review"],
      });
      prismaMock.taskContract.update.mockRejectedValue({ code: "P2025" });

      await expect(service.accept("task-1", "seller-1"))
        .rejects.toThrow("no longer open for acceptance");
    });
  });

  // ─── submit ────────────────────────────────────────────────────────────

  describe("submit", () => {
    const inProgressTask = {
      ...mockTask,
      sellerAgentId: "seller-1",
      status: "IN_PROGRESS",
    };

    it("transitions IN_PROGRESS to SUBMITTED", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(inProgressTask);
      prismaMock.taskContract.update.mockResolvedValue({ ...inProgressTask, status: "SUBMITTED" });

      const task = await service.submit("task-1", "seller-1", { result: "done" });
      expect(task.status).toBe("SUBMITTED");
    });

    it("rejects wrong seller", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(inProgressTask);

      await expect(service.submit("task-1", "wrong-seller", { result: "done" }))
        .rejects.toThrow("Only the assigned seller");
    });

    it("rejects empty outputData", async () => {
      await expect(service.submit("task-1", "seller-1", {} as any))
        .rejects.toThrow("outputData must be a non-empty object");
    });

    it("rejects null outputData", async () => {
      await expect(service.submit("task-1", "seller-1", null as any))
        .rejects.toThrow("outputData must be a non-empty object");
    });
  });

  // ─── verify ────────────────────────────────────────────────────────────

  describe("verify", () => {
    const submittedTask = {
      ...mockTask,
      sellerAgentId: "seller-1",
      status: "SUBMITTED",
      acceptedAt: new Date("2025-01-01T00:00:00Z"),
      submittedAt: new Date("2025-01-01T00:01:00Z"),
    };

    it("on pass: releases escrow, records reputation, sets COMPLETED", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(submittedTask);
      prismaMock.taskContract.update.mockResolvedValue({ ...submittedTask, status: "COMPLETED" });

      await service.verify("task-1", true, { qualityScore: 90 });

      expect(mockEscrow.releaseFunds).toHaveBeenCalledWith("task-1");
      expect(mockReputation.recordTaskCompletion).toHaveBeenCalledWith(
        "seller-1", "task-1", true, 60000, 90
      );
    });

    it("on fail: refunds escrow, records failure, sets FAILED", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(submittedTask);
      prismaMock.taskContract.update.mockResolvedValue({ ...submittedTask, status: "FAILED" });

      await service.verify("task-1", false);

      expect(mockEscrow.refundFunds).toHaveBeenCalledWith("task-1");
      expect(mockReputation.recordTaskCompletion).toHaveBeenCalledWith(
        "seller-1", "task-1", false, 0, 0
      );
    });

    it("rejects non-SUBMITTED tasks", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue({ ...mockTask, status: "OPEN" });

      await expect(service.verify("task-1", true))
        .rejects.toThrow("not submitted for verification");
    });
  });

  // ─── dispute ───────────────────────────────────────────────────────────

  describe("dispute", () => {
    it("freezes escrow and records event", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue({
        ...mockTask,
        sellerAgentId: "seller-1",
        status: "SUBMITTED",
      });
      prismaMock.taskContract.update.mockResolvedValue({ ...mockTask, status: "DISPUTED" });

      await service.dispute("task-1", "bad output quality");

      expect(mockEscrow.freezeFunds).toHaveBeenCalledWith("task-1", "bad output quality");
      expect(mockReputation.recordEvent).toHaveBeenCalledWith(
        "seller-1", "task-1", "DISPUTE_RAISED", 1
      );
    });

    it("rejects dispute on COMPLETED tasks", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue({ ...mockTask, status: "COMPLETED" });

      await expect(service.dispute("task-1", "reason"))
        .rejects.toThrow("Cannot dispute task");
    });
  });

  // ─── resolveDispute ────────────────────────────────────────────────────

  describe("resolveDispute", () => {
    const disputedTask = {
      ...mockTask,
      sellerAgentId: "seller-1",
      status: "DISPUTED",
    };

    it("release_to_seller: releases escrow and sets COMPLETED", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(disputedTask);
      prismaMock.taskContract.update.mockResolvedValue({ ...disputedTask, status: "COMPLETED" });

      await service.resolveDispute("task-1", "release_to_seller");

      expect(mockEscrow.releaseFunds).toHaveBeenCalledWith("task-1");
      expect(mockReputation.recordEvent).toHaveBeenCalledWith(
        "seller-1", "task-1", "DISPUTE_RESOLVED", 1
      );
    });

    it("refund_to_buyer: refunds escrow and sets FAILED", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue(disputedTask);
      prismaMock.taskContract.update.mockResolvedValue({ ...disputedTask, status: "FAILED" });

      await service.resolveDispute("task-1", "refund_to_buyer");

      expect(mockEscrow.refundFunds).toHaveBeenCalledWith("task-1");
      expect(mockReputation.recordEvent).toHaveBeenCalledWith(
        "seller-1", "task-1", "DISPUTE_RESOLVED", 0
      );
    });

    it("rejects non-DISPUTED tasks", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValue({ ...mockTask, status: "OPEN" });

      await expect(service.resolveDispute("task-1", "release_to_seller"))
        .rejects.toThrow("not disputed");
    });
  });

  // ─── expireStale ───────────────────────────────────────────────────────

  describe("expireStale", () => {
    it("expires stale OPEN tasks", async () => {
      prismaMock.taskContract.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.expireStale();
      expect(count).toBe(3);
      expect(prismaMock.taskContract.updateMany).toHaveBeenCalledWith({
        where: { status: "OPEN", expiresAt: { lt: expect.any(Date) } },
        data: { status: "EXPIRED" },
      });
    });
  });
});
