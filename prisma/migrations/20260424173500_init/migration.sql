-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('PER_CALL', 'PER_TASK', 'SUBSCRIPTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('API_KEY', 'OAUTH2', 'BEARER_TOKEN', 'NONE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFYING', 'COMPLETED', 'FAILED', 'DISPUTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOCK', 'STRIPE', 'USDC', 'SKYFIRE');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('TASK_COMPLETED', 'TASK_FAILED', 'RESPONSE_TIME', 'QUALITY_SCORE', 'DISPUTE_RAISED', 'DISPUTE_RESOLVED');

-- CreateEnum
CREATE TYPE "WaitlistRole" AS ENUM ('BUYER', 'SELLER', 'BOTH');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "capabilities" TEXT[],
    "pricing_model" "PricingModel" NOT NULL DEFAULT 'PER_TASK',
    "price_per_unit" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sla_response_ms" INTEGER,
    "sla_uptime_pct" DOUBLE PRECISION,
    "auth_method" "AuthMethod" NOT NULL DEFAULT 'API_KEY',
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "sample_input" JSONB,
    "sample_output" JSONB,
    "reputation_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_tasks" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_response_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispute_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "label" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['read', 'write']::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_contracts" (
    "id" TEXT NOT NULL,
    "buyer_agent_id" TEXT NOT NULL,
    "seller_agent_id" TEXT,
    "capability_requested" TEXT NOT NULL,
    "input_schema" JSONB NOT NULL,
    "input_data" JSONB,
    "output_schema" JSONB,
    "output_data" JSONB,
    "quality_criteria" JSONB,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timeout_ms" INTEGER NOT NULL DEFAULT 300000,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "accepted_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "verification_result" JSONB,
    "dispute_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "task_contract_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'MOCK',
    "escrow_status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "external_ref" TEXT,
    "released_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "dispute_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_events" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "task_contract_id" TEXT,
    "metric_type" "MetricType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "role" "WaitlistRole" NOT NULL,
    "use_case" TEXT NOT NULL,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agents_status_reputation_score_idx" ON "agents"("status", "reputation_score" DESC);

-- CreateIndex
CREATE INDEX "agents_capabilities_idx" ON "agents"("capabilities");

-- CreateIndex
CREATE INDEX "agents_owner_id_idx" ON "agents"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_owner_id_idx" ON "api_keys"("owner_id");

-- CreateIndex
CREATE INDEX "task_contracts_status_idx" ON "task_contracts"("status");

-- CreateIndex
CREATE INDEX "task_contracts_buyer_agent_id_idx" ON "task_contracts"("buyer_agent_id");

-- CreateIndex
CREATE INDEX "task_contracts_seller_agent_id_idx" ON "task_contracts"("seller_agent_id");

-- CreateIndex
CREATE INDEX "task_contracts_capability_requested_idx" ON "task_contracts"("capability_requested");

-- CreateIndex
CREATE INDEX "transactions_task_contract_id_idx" ON "transactions"("task_contract_id");

-- CreateIndex
CREATE INDEX "transactions_escrow_status_idx" ON "transactions"("escrow_status");

-- CreateIndex
CREATE INDEX "reputation_events_agent_id_created_at_idx" ON "reputation_events"("agent_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reputation_events_metric_type_idx" ON "reputation_events"("metric_type");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_signups_email_key" ON "waitlist_signups"("email");

-- CreateIndex
CREATE INDEX "waitlist_signups_created_at_idx" ON "waitlist_signups"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_contracts" ADD CONSTRAINT "task_contracts_buyer_agent_id_fkey" FOREIGN KEY ("buyer_agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_contracts" ADD CONSTRAINT "task_contracts_seller_agent_id_fkey" FOREIGN KEY ("seller_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_task_contract_id_fkey" FOREIGN KEY ("task_contract_id") REFERENCES "task_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_task_contract_id_fkey" FOREIGN KEY ("task_contract_id") REFERENCES "task_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
