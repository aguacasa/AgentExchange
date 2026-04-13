// Domain types mirroring the Prisma schema.
// Defined here so TS can resolve them without depending on Prisma's @ts-nocheck files.

export type AgentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type PricingModel = "PER_CALL" | "PER_TASK" | "SUBSCRIPTION" | "CUSTOM";
export type AuthMethod = "API_KEY" | "OAUTH2" | "BEARER_TOKEN" | "NONE";
export type TaskStatus = "OPEN" | "ACCEPTED" | "IN_PROGRESS" | "SUBMITTED" | "VERIFYING" | "COMPLETED" | "FAILED" | "DISPUTED" | "CANCELLED" | "EXPIRED";
export type EscrowStatus = "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED";
export type PaymentMethod = "MOCK" | "STRIPE" | "USDC" | "SKYFIRE";
export type MetricType = "TASK_COMPLETED" | "TASK_FAILED" | "RESPONSE_TIME" | "QUALITY_SCORE" | "DISPUTE_RAISED" | "DISPUTE_RESOLVED";

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  endpointUrl: string;
  capabilities: string[];
  pricingModel: PricingModel;
  pricePerUnit: number;
  currency: string;
  slaResponseMs: number | null;
  slaUptimePct: number | null;
  authMethod: AuthMethod;
  status: AgentStatus;
  metadata: unknown;
  sampleInput: unknown;
  sampleOutput: unknown;
  reputationScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  agentId: string | null;
  ownerId: string;
  keyHash: string;
  keyPrefix: string;
  label: string | null;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
  createdAt: Date;
}

export interface TaskContract {
  id: string;
  buyerAgentId: string;
  sellerAgentId: string | null;
  capabilityRequested: string;
  inputSchema: unknown;
  inputData: unknown;
  outputSchema: unknown;
  outputData: unknown;
  qualityCriteria: unknown;
  price: number;
  currency: string;
  timeoutMs: number;
  status: TaskStatus;
  acceptedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  verificationResult: unknown;
  disputeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  taskContractId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  escrowStatus: EscrowStatus;
  externalRef: string | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
  disputeReason: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReputationEvent {
  id: string;
  agentId: string;
  taskContractId: string | null;
  metricType: MetricType;
  score: number;
  weight: number;
  metadata: unknown;
  createdAt: Date;
}
