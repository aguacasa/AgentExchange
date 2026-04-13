// Abstract payment provider interface — swap in Stripe, USDC, Skyfire later

import crypto from "crypto";

export interface EscrowResult {
  externalRef: string;
  status: "held" | "released" | "refunded" | "failed";
}

export interface PaymentProvider {
  name: string;
  holdEscrow(amount: number, currency: string, metadata: Record<string, string>): Promise<EscrowResult>;
  releaseEscrow(externalRef: string): Promise<EscrowResult>;
  refundEscrow(externalRef: string): Promise<EscrowResult>;
}

// ─── Mock Provider (development only) ────────────────────────────────────────

export class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  private ledger = new Map<string, { amount: number; currency: string; status: string }>();

  async holdEscrow(amount: number, currency: string, metadata: Record<string, string>): Promise<EscrowResult> {
    const ref = `mock_${crypto.randomUUID()}`;
    this.ledger.set(ref, { amount, currency, status: "held" });
    if (process.env.NODE_ENV !== "test") {
      console.log(`[MockPayment] HOLD ${amount} ${currency} → ${ref}`, metadata);
    }
    return { externalRef: ref, status: "held" };
  }

  async releaseEscrow(externalRef: string): Promise<EscrowResult> {
    const entry = this.ledger.get(externalRef);
    if (!entry) return { externalRef, status: "failed" };
    entry.status = "released";
    if (process.env.NODE_ENV !== "test") {
      console.log(`[MockPayment] RELEASE ${externalRef} → ${entry.amount} ${entry.currency}`);
    }
    return { externalRef, status: "released" };
  }

  async refundEscrow(externalRef: string): Promise<EscrowResult> {
    const entry = this.ledger.get(externalRef);
    if (!entry) return { externalRef, status: "failed" };
    entry.status = "refunded";
    if (process.env.NODE_ENV !== "test") {
      console.log(`[MockPayment] REFUND ${externalRef} → ${entry.amount} ${entry.currency}`);
    }
    return { externalRef, status: "refunded" };
  }
}

// Singleton — switch provider here when integrating real payments
let provider: PaymentProvider = new MockPaymentProvider();

// Production guard: prevent mock provider from being used in production
if (process.env.NODE_ENV === "production" && provider.name === "mock") {
  throw new Error(
    "FATAL: MockPaymentProvider cannot be used in production. " +
    "Configure a real payment provider (Stripe, USDC, Skyfire)."
  );
}

export function getPaymentProvider(): PaymentProvider {
  return provider;
}

export function setPaymentProvider(p: PaymentProvider): void {
  provider = p;
}
