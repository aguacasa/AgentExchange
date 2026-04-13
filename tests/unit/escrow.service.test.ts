import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

import { setPaymentProvider, PaymentProvider } from "../../src/providers/payment";
import { EscrowService } from "../../src/services/escrow.service";

function createMockProvider(): PaymentProvider & {
  holdEscrow: ReturnType<typeof vi.fn>;
  releaseEscrow: ReturnType<typeof vi.fn>;
  refundEscrow: ReturnType<typeof vi.fn>;
} {
  return {
    name: "mock",
    holdEscrow: vi.fn(),
    releaseEscrow: vi.fn(),
    refundEscrow: vi.fn(),
  };
}

describe("EscrowService", () => {
  let service: EscrowService;
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    service = new EscrowService();
    mockProvider = createMockProvider();
    setPaymentProvider(mockProvider);
  });

  describe("holdFunds", () => {
    it("creates HELD transaction when provider succeeds", async () => {
      mockProvider.holdEscrow.mockResolvedValue({ externalRef: "ref-1", status: "held" });
      prismaMock.transaction.create.mockResolvedValue({ id: "tx-1", escrowStatus: "HELD" });

      const tx = await service.holdFunds("task-1", 500, "USD");

      expect(mockProvider.holdEscrow).toHaveBeenCalledWith(500, "USD", { taskContractId: "task-1" });
      expect(prismaMock.transaction.create).toHaveBeenCalled();
      expect(tx.escrowStatus).toBe("HELD");
    });

    it("throws 502 when provider fails to hold", async () => {
      mockProvider.holdEscrow.mockResolvedValue({ externalRef: "ref-1", status: "failed" });

      await expect(service.holdFunds("task-1", 500, "USD")).rejects.toThrow("Payment provider failed to hold escrow");
    });
  });

  describe("releaseFunds", () => {
    it("updates transaction to RELEASED", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue({ id: "tx-1", externalRef: "ref-1" });
      mockProvider.releaseEscrow.mockResolvedValue({ externalRef: "ref-1", status: "released" });
      prismaMock.transaction.update.mockResolvedValue({ id: "tx-1", escrowStatus: "RELEASED" });

      const tx = await service.releaseFunds("task-1");
      expect(tx.escrowStatus).toBe("RELEASED");
    });

    it("throws 404 when no HELD transaction found", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null);

      await expect(service.releaseFunds("task-1")).rejects.toThrow("No held escrow found");
    });

    it("throws 502 when provider fails to release", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue({ id: "tx-1", externalRef: "ref-1" });
      mockProvider.releaseEscrow.mockResolvedValue({ externalRef: "ref-1", status: "failed" });

      await expect(service.releaseFunds("task-1")).rejects.toThrow("Payment provider failed to release escrow");
    });
  });

  describe("refundFunds", () => {
    it("updates transaction to REFUNDED", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue({ id: "tx-1", externalRef: "ref-1" });
      mockProvider.refundEscrow.mockResolvedValue({ externalRef: "ref-1", status: "refunded" });
      prismaMock.transaction.update.mockResolvedValue({ id: "tx-1", escrowStatus: "REFUNDED" });

      const tx = await service.refundFunds("task-1");
      expect(tx.escrowStatus).toBe("REFUNDED");
    });

    it("throws when no HELD transaction found", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null);
      await expect(service.refundFunds("task-1")).rejects.toThrow("No held escrow found");
    });
  });

  describe("freezeFunds", () => {
    it("updates transaction to DISPUTED with reason", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue({ id: "tx-1" });
      prismaMock.transaction.update.mockResolvedValue({ id: "tx-1", escrowStatus: "DISPUTED", disputeReason: "bad output" });

      const tx = await service.freezeFunds("task-1", "bad output");
      expect(tx.escrowStatus).toBe("DISPUTED");
      expect(tx.disputeReason).toBe("bad output");
    });

    it("throws when no HELD transaction found", async () => {
      prismaMock.transaction.findFirst.mockResolvedValue(null);
      await expect(service.freezeFunds("task-1", "reason")).rejects.toThrow("No held escrow found");
    });
  });
});
