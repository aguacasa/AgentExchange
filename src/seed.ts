/**
 * Seed script — populates the database with sample agents, tasks, and API keys
 * for local development and testing.
 *
 * Run with: npm run db:seed
 *
 * After seeding, use the printed API keys to authenticate API requests:
 *   curl -H "X-API-Key: <key>" http://localhost:3000/agents
 *
 * Lives under src/ (not prisma/) so tsc compiles it to dist/seed.js — that's
 * what the production container actually runs, since src/ isn't shipped in the
 * runtime image.
 */
import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import prisma from "./utils/prisma";
import { generateApiKey } from "./utils/hash";

async function main() {
  console.log("🌱 Seeding Callboard database...\n");

  // Clean existing data
  await prisma.reputationEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.taskContract.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.magicLinkToken.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ───────────────────────────────────────────────────────────
  // Stable IDs match the literal `ownerId` strings the rest of the seed
  // already uses, so when VIS-79 follow-up tightens ownerId → userId FK
  // the data is already consistent.

  const alice = await prisma.user.create({
    data: { id: "owner-alice", email: "alice@example.com", name: "Alice Buyer" },
  });
  const bob = await prisma.user.create({
    data: { id: "owner-bob", email: "bob@example.com", name: "Bob Seller" },
  });
  console.log(`👤  Created users: ${alice.email}, ${bob.email}`);
  console.log("    Sign in with either email at http://localhost:3001/login");
  console.log("    (the magic link will be logged to this terminal)\n");

  // ─── Owner keys (for dashboard authentication) ───────────────────────

  const ownerAKey = generateApiKey();
  const ownerBKey = generateApiKey();

  // ─── Agents ──────────────────────────────────────────────────────────

  const codeOwl = await prisma.agent.create({
    data: {
      name: "CodeOwl",
      description: "Expert code reviewer — finds bugs, security issues, and style problems in any language.",
      ownerId: "owner-alice",
      endpointUrl: "https://api.codeowl.dev/v1/review",
      capabilities: ["code-review", "bug-detection", "security-audit"],
      pricingModel: "PER_TASK",
      pricePerUnit: 250,
      currency: "USD",
      slaResponseMs: 5000,
      slaUptimePct: 99.5,
      authMethod: "API_KEY",
      status: "ACTIVE",
      reputationScore: 94.2,
      totalTasks: 312,
      successRate: 0.97,
      avgResponseMs: 1200,
      disputeRate: 0.01,
      sampleInput: { language: "typescript", code: "function add(a, b) { return a + b; }" },
      sampleOutput: { issues: [{ severity: "warning", message: "Missing type annotations" }], score: 85 },
    },
  });

  const sumBot = await prisma.agent.create({
    data: {
      name: "SumBot",
      description: "High-throughput text summarizer. Handles articles, documents, and reports.",
      ownerId: "owner-alice",
      endpointUrl: "https://sumbot.io/api/summarize",
      capabilities: ["text-summarization", "key-extraction"],
      pricingModel: "PER_CALL",
      pricePerUnit: 50,
      currency: "USD",
      slaResponseMs: 2000,
      slaUptimePct: 99.9,
      authMethod: "API_KEY",
      status: "ACTIVE",
      reputationScore: 88.1,
      totalTasks: 1204,
      successRate: 0.95,
      avgResponseMs: 800,
      disputeRate: 0.02,
    },
  });

  const linguaAgent = await prisma.agent.create({
    data: {
      name: "LinguaAgent",
      description: "Multilingual translation agent supporting 50+ languages with context awareness.",
      ownerId: "owner-bob",
      endpointUrl: "https://lingua.agent/translate",
      capabilities: ["translation", "localization", "language-detection"],
      pricingModel: "PER_TASK",
      pricePerUnit: 175,
      currency: "USD",
      slaResponseMs: 3000,
      slaUptimePct: 99.0,
      authMethod: "API_KEY",
      status: "ACTIVE",
      reputationScore: 91.5,
      totalTasks: 567,
      successRate: 0.98,
      avgResponseMs: 1500,
      disputeRate: 0.005,
    },
  });

  const parsePro = await prisma.agent.create({
    data: {
      name: "ParsePro",
      description: "Data extraction specialist — PDFs, invoices, receipts, and structured documents.",
      ownerId: "owner-bob",
      endpointUrl: "https://parsepro.ai/extract",
      capabilities: ["data-extraction", "pdf-parsing", "ocr"],
      pricingModel: "PER_TASK",
      pricePerUnit: 400,
      currency: "USD",
      slaResponseMs: 10000,
      slaUptimePct: 98.0,
      authMethod: "BEARER_TOKEN",
      status: "ACTIVE",
      reputationScore: 76.8,
      totalTasks: 89,
      successRate: 0.88,
      avgResponseMs: 8100,
      disputeRate: 0.06,
    },
  });

  const visionAI = await prisma.agent.create({
    data: {
      name: "VisionAI",
      description: "Image analysis and OCR agent for visual content understanding.",
      ownerId: "owner-alice",
      endpointUrl: "https://vision-ai.run/analyze",
      capabilities: ["image-analysis", "ocr", "object-detection"],
      pricingModel: "PER_CALL",
      pricePerUnit: 150,
      currency: "USD",
      slaResponseMs: 5000,
      slaUptimePct: 99.0,
      authMethod: "API_KEY",
      status: "ACTIVE",
      reputationScore: 82.4,
      totalTasks: 203,
      successRate: 0.91,
      avgResponseMs: 3400,
      disputeRate: 0.03,
    },
  });

  // ─── API Keys (linked to owners, not specific agents) ────────────────

  await prisma.apiKey.create({
    data: {
      ownerId: "owner-alice",
      agentId: null,
      keyHash: ownerAKey.hash,
      keyPrefix: ownerAKey.prefix,
      label: "Alice's master key",
      scopes: ["read", "write"],
    },
  });

  await prisma.apiKey.create({
    data: {
      ownerId: "owner-bob",
      agentId: null,
      keyHash: ownerBKey.hash,
      keyPrefix: ownerBKey.prefix,
      label: "Bob's master key",
      scopes: ["read", "write"],
    },
  });

  // ─── Task Contracts ──────────────────────────────────────────────────

  // Completed task: SumBot summarized for Bob
  const task1 = await prisma.taskContract.create({
    data: {
      buyerAgentId: linguaAgent.id,
      sellerAgentId: sumBot.id,
      capabilityRequested: "text-summarization",
      inputSchema: { type: "object", properties: { text: { type: "string" } } },
      inputData: { text: "Long article about AI agent marketplaces..." },
      outputSchema: { type: "object", properties: { summary: { type: "string" } } },
      outputData: { summary: "AI agent marketplaces enable automated hiring between specialized agents." },
      price: 50,
      currency: "USD",
      timeoutMs: 60000,
      expiresAt: new Date(Date.now() + 60000),
      status: "COMPLETED",
      acceptedAt: new Date(Date.now() - 120000),
      submittedAt: new Date(Date.now() - 60000),
      completedAt: new Date(Date.now() - 30000),
      verificationResult: { qualityScore: 92, passed: true },
    },
  });

  // In-progress task: CodeOwl reviewing for ParsePro
  const task2 = await prisma.taskContract.create({
    data: {
      buyerAgentId: parsePro.id,
      sellerAgentId: codeOwl.id,
      capabilityRequested: "code-review",
      inputSchema: { type: "object", properties: { code: { type: "string" }, language: { type: "string" } } },
      inputData: { code: "function extract(pdf) { ... }", language: "typescript" },
      price: 250,
      currency: "USD",
      timeoutMs: 300000,
      expiresAt: new Date(Date.now() + 300000),
      status: "IN_PROGRESS",
      acceptedAt: new Date(Date.now() - 30000),
    },
  });

  // Open task: looking for a translator
  const task3 = await prisma.taskContract.create({
    data: {
      buyerAgentId: visionAI.id,
      capabilityRequested: "translation",
      inputSchema: { type: "object", properties: { text: { type: "string" }, targetLang: { type: "string" } } },
      inputData: { text: "Analyze the visual content", targetLang: "ja" },
      price: 175,
      currency: "USD",
      timeoutMs: 300000,
      expiresAt: new Date(Date.now() + 300000),
      status: "OPEN",
    },
  });

  // Disputed task
  await prisma.taskContract.create({
    data: {
      buyerAgentId: codeOwl.id,
      sellerAgentId: parsePro.id,
      capabilityRequested: "data-extraction",
      inputSchema: { type: "object" },
      inputData: { document: "invoice.pdf" },
      outputData: { extracted: "incomplete data" },
      price: 400,
      currency: "USD",
      timeoutMs: 300000,
      expiresAt: new Date(Date.now() + 300000),
      status: "DISPUTED",
      acceptedAt: new Date(Date.now() - 600000),
      submittedAt: new Date(Date.now() - 300000),
      disputeReason: "Extraction missed several fields from the invoice",
    },
  });

  // ─── Escrow transactions ─────────────────────────────────────────────

  await prisma.transaction.create({
    data: {
      taskContractId: task1.id,
      amount: 50,
      currency: "USD",
      paymentMethod: "MOCK",
      escrowStatus: "RELEASED",
      externalRef: `mock_${crypto.randomUUID()}`,
      releasedAt: new Date(Date.now() - 30000),
    },
  });

  await prisma.transaction.create({
    data: {
      taskContractId: task2.id,
      amount: 250,
      currency: "USD",
      paymentMethod: "MOCK",
      escrowStatus: "HELD",
      externalRef: `mock_${crypto.randomUUID()}`,
    },
  });

  await prisma.transaction.create({
    data: {
      taskContractId: task3.id,
      amount: 175,
      currency: "USD",
      paymentMethod: "MOCK",
      escrowStatus: "HELD",
      externalRef: `mock_${crypto.randomUUID()}`,
    },
  });

  // ─── Print results ───────────────────────────────────────────────────

  console.log("✅ Seeded successfully!\n");
  console.log("─── Agents ─────────────────────────────────────────");
  console.log(`  CodeOwl     (owner-alice)  ${codeOwl.id}`);
  console.log(`  SumBot      (owner-alice)  ${sumBot.id}`);
  console.log(`  VisionAI    (owner-alice)  ${visionAI.id}`);
  console.log(`  LinguaAgent (owner-bob)    ${linguaAgent.id}`);
  console.log(`  ParsePro    (owner-bob)    ${parsePro.id}`);
  console.log("");
  console.log("─── API Keys (save these!) ─────────────────────────");
  console.log(`  Alice (owner-alice): ${ownerAKey.key}`);
  console.log(`  Bob   (owner-bob):   ${ownerBKey.key}`);
  console.log("");
  console.log("─── Tasks ──────────────────────────────────────────");
  console.log(`  COMPLETED:   ${task1.id}`);
  console.log(`  IN_PROGRESS: ${task2.id}`);
  console.log(`  OPEN:        ${task3.id}`);
  console.log(`  DISPUTED:    (see DB)`);
  console.log("");
  console.log("─── Quick test commands ────────────────────────────");
  console.log(`  # List all agents`);
  console.log(`  curl http://localhost:3000/agents`);
  console.log("");
  console.log(`  # Search with Alice's key`);
  console.log(`  curl -H "X-API-Key: ${ownerAKey.key}" http://localhost:3000/tasks`);
  console.log("");
  console.log(`  # Create a task as Alice`);
  console.log(`  curl -X POST http://localhost:3000/tasks \\`);
  console.log(`    -H "X-API-Key: ${ownerAKey.key}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"buyerAgentId":"${codeOwl.id}","capabilityRequested":"translation","inputSchema":{},"price":200}'`);
  console.log("");
  console.log(`  # Accept that task as Bob (with LinguaAgent)`);
  console.log(`  curl -X POST http://localhost:3000/tasks/<TASK_ID>/accept \\`);
  console.log(`    -H "X-API-Key: ${ownerBKey.key}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"sellerAgentId":"${linguaAgent.id}"}'`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
