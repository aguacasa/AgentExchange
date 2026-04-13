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
vi.mock("../../src/services/reputation.service", () => ({
  reputationService: { recordTaskCompletion: vi.fn(), recordEvent: vi.fn() },
}));

import { TaskService } from "../../src/services/task.service";

describe("Authorization (BOLA Prevention)", () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService();
    mockEscrow.holdFunds.mockResolvedValue({});
    mockEscrow.releaseFunds.mockResolvedValue({});
    mockEscrow.refundFunds.mockResolvedValue({});
    mockEscrow.freezeFunds.mockResolvedValue({});
  });

  describe("create — caller must own buyer agent", () => {
    it("allows when caller owns the buyer agent", async () => {
      // Caller owns the buyer agent
      prismaMock.agent.findUnique
        .mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" })  // assertCallerOwnsAgent
        .mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" }); // buyer existence check
      prismaMock.taskContract.create.mockResolvedValue({ id: "t-1", status: "OPEN", price: 100 });

      await expect(
        service.create({
          buyerAgentId: "buyer-1",
          capabilityRequested: "review",
          inputSchema: {},
          price: 100,
        }, "owner-A")
      ).resolves.toBeDefined();
    });

    it("rejects when caller does NOT own the buyer agent", async () => {
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" });

      await expect(
        service.create({
          buyerAgentId: "buyer-1",
          capabilityRequested: "review",
          inputSchema: {},
          price: 100,
        }, "attacker-B")
      ).rejects.toThrow("You do not own this agent");
    });
  });

  describe("accept — caller must own seller agent", () => {
    it("rejects when caller does NOT own the seller agent", async () => {
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "seller-1", ownerId: "owner-A" });

      await expect(
        service.accept("task-1", "seller-1", "attacker-B")
      ).rejects.toThrow("You do not own this agent");
    });
  });

  describe("submit — caller must own seller agent", () => {
    it("rejects when caller does NOT own the seller agent", async () => {
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "seller-1", ownerId: "owner-A" });

      await expect(
        service.submit("task-1", "seller-1", { result: "data" }, "attacker-B")
      ).rejects.toThrow("You do not own this agent");
    });
  });

  describe("verify — caller must own buyer agent", () => {
    it("rejects when caller does NOT own the buyer agent", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        id: "task-1",
        buyerAgentId: "buyer-1",
        sellerAgentId: "seller-1",
        status: "SUBMITTED",
      });
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" });

      await expect(
        service.verify("task-1", true, undefined, "attacker-B")
      ).rejects.toThrow("You do not own this agent");
    });
  });

  describe("dispute — caller must be buyer or seller", () => {
    it("rejects when caller is not a party to the task", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        id: "task-1",
        buyerAgentId: "buyer-1",
        sellerAgentId: "seller-1",
        status: "IN_PROGRESS",
      });
      // Check buyer agent ownership
      prismaMock.agent.findUnique
        .mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" })   // buyer check
        .mockResolvedValueOnce({ id: "seller-1", ownerId: "owner-B" }); // seller check

      await expect(
        service.dispute("task-1", "bad work", "attacker-C")
      ).rejects.toThrow("not a party to this task");
    });

    it("allows when caller owns the buyer agent", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        id: "task-1",
        buyerAgentId: "buyer-1",
        sellerAgentId: "seller-1",
        status: "IN_PROGRESS",
      });
      // assertCallerIsParty → buyer check passes
      prismaMock.agent.findUnique.mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" });
      prismaMock.taskContract.update.mockResolvedValueOnce({ id: "task-1", status: "DISPUTED" });

      await expect(
        service.dispute("task-1", "bad work", "owner-A")
      ).resolves.toBeDefined();
    });
  });

  describe("resolveDispute — caller must be party", () => {
    it("rejects when caller is not a party", async () => {
      prismaMock.taskContract.findUnique.mockResolvedValueOnce({
        id: "task-1",
        buyerAgentId: "buyer-1",
        sellerAgentId: "seller-1",
        status: "DISPUTED",
      });
      prismaMock.agent.findUnique
        .mockResolvedValueOnce({ id: "buyer-1", ownerId: "owner-A" })
        .mockResolvedValueOnce({ id: "seller-1", ownerId: "owner-B" });

      await expect(
        service.resolveDispute("task-1", "release_to_seller", undefined, "attacker-C")
      ).rejects.toThrow("not a party to this task");
    });
  });
});

describe("Scope Enforcement", () => {
  it("expressAuthentication rejects key with insufficient scopes", async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({
      id: "key-1",
      ownerId: "owner-1",
      agentId: null,
      scopes: ["read"],
      revoked: false,
      expiresAt: null,
      keyHash: "abc",
    });

    // We need to import the auth function
    const { expressAuthentication } = await import("../../src/middleware/tsoa-auth");

    const req = { header: (name: string) => name === "X-API-Key" ? "cb_test" : undefined } as any;

    // Should fail because key has ["read"] but we require ["write"]
    await expect(
      expressAuthentication(req, "api_key", ["write"])
    ).rejects.toThrow("Missing scopes: write");
  });

  it("expressAuthentication allows key with matching scopes", async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({
      id: "key-1",
      ownerId: "owner-1",
      agentId: null,
      scopes: ["read", "write"],
      revoked: false,
      expiresAt: null,
      keyHash: "abc",
    });

    const { expressAuthentication } = await import("../../src/middleware/tsoa-auth");
    const req = { header: (name: string) => name === "X-API-Key" ? "cb_test" : undefined } as any;

    await expect(
      expressAuthentication(req, "api_key", ["write"])
    ).resolves.toBeDefined();
  });
});
