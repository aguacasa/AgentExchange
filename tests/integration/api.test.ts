/**
 * End-to-end HTTP integration tests using supertest + mocked Prisma.
 *
 * These verify that:
 * - Routes are wired correctly
 * - Authentication middleware runs as expected
 * - Request/response shapes match the OpenAPI contract
 * - Error cases return correct HTTP status codes
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

// Prevent the expiry cron from starting during tests
vi.mock("../../src/jobs/expireStaleTasks", () => ({
  startExpireStaleTasksJob: vi.fn(),
}));

// Keep mock payment provider quiet
process.env.NODE_ENV = "test";

import request from "supertest";
import app from "../../src/server";
import { hashApiKey } from "../../src/utils/hash";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_KEY = "cb_test1234567890abcdefabcdef1234567890abcdef1234567890abcdef1234";
const VALID_KEY_HASH = hashApiKey(VALID_KEY);

const READ_ONLY_KEY = "cb_readonly890abcdef1234567890abcdef1234567890abcdef1234567890";
const READ_ONLY_KEY_HASH = hashApiKey(READ_ONLY_KEY);

function mockAuthenticatedKey(scopes: string[] = ["read", "write"]) {
  prismaMock.apiKey.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.keyHash === VALID_KEY_HASH) {
      return {
        id: "key-1",
        ownerId: "owner-alice",
        agentId: null,
        scopes,
        keyHash: VALID_KEY_HASH,
        keyPrefix: VALID_KEY.slice(0, 11),
        label: "test",
        revoked: false,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      };
    }
    if (where.keyHash === READ_ONLY_KEY_HASH) {
      return {
        id: "key-2",
        ownerId: "owner-alice",
        agentId: null,
        scopes: ["read"],
        keyHash: READ_ONLY_KEY_HASH,
        keyPrefix: READ_ONLY_KEY.slice(0, 11),
        label: "readonly",
        revoked: false,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      };
    }
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Health & Discovery ──────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with service info (unauthenticated)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("callboard");
  });
});

describe("GET /openapi.json", () => {
  it("serves the OpenAPI spec publicly", async () => {
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBeDefined();
    expect(res.body.paths).toBeDefined();
  });
});

// ─── Agents ──────────────────────────────────────────────────────────────────

describe("POST /agents", () => {
  it("creates an agent without authentication (bootstrap)", async () => {
    prismaMock.agent.create.mockResolvedValue({
      id: "agent-1",
      name: "TestBot",
      ownerId: "owner_abc",
      endpointUrl: "https://example.com",
      capabilities: ["review"],
      pricingModel: "PER_TASK",
      pricePerUnit: 100,
      currency: "USD",
      authMethod: "API_KEY",
      status: "ACTIVE",
      reputationScore: 0,
      totalTasks: 0,
      successRate: 0,
      avgResponseMs: 0,
      disputeRate: 0,
    });

    const res = await request(app)
      .post("/agents")
      .send({
        name: "TestBot",
        endpointUrl: "https://example.com",
        capabilities: ["review"],
        pricePerUnit: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.agent).toBeDefined();
    expect(res.body.apiKey).toMatch(/^cb_/);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app).post("/agents").send({ name: "" });
    expect([400, 422]).toContain(res.status);
  });
});

describe("GET /agents", () => {
  it("lists agents without authentication (public discovery)", async () => {
    prismaMock.agent.findMany.mockResolvedValue([
      {
        id: "agent-1",
        name: "TestBot",
        capabilities: ["review"],
        pricePerUnit: 100,
        status: "ACTIVE",
        reputationScore: 85,
      },
    ]);
    prismaMock.agent.count.mockResolvedValue(1);

    const res = await request(app).get("/agents");
    expect(res.status).toBe(200);
    expect(res.body.agents).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("clamps limit to max 100", async () => {
    prismaMock.agent.findMany.mockResolvedValue([]);
    prismaMock.agent.count.mockResolvedValue(0);

    await request(app).get("/agents?limit=100000");

    const call = prismaMock.agent.findMany.mock.calls[0][0] as any;
    expect(call.take).toBeLessThanOrEqual(100);
  });
});

// ─── Tasks authorization ─────────────────────────────────────────────────────

describe("POST /tasks (auth required)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({
        buyerAgentId: "a-1",
        capabilityRequested: "review",
        inputSchema: {},
        price: 100,
      });
    expect(res.status).toBe(401);
  });

  it("rejects invalid API keys with 401", async () => {
    mockAuthenticatedKey();
    const res = await request(app)
      .post("/tasks")
      .set("X-API-Key", "cb_invalid_key_not_in_db")
      .send({
        buyerAgentId: "a-1",
        capabilityRequested: "review",
        inputSchema: {},
        price: 100,
      });
    expect(res.status).toBe(401);
  });

  it("rejects read-only key with insufficient scope", async () => {
    mockAuthenticatedKey();
    const res = await request(app)
      .post("/tasks")
      .set("X-API-Key", READ_ONLY_KEY)
      .send({
        buyerAgentId: "a-1",
        capabilityRequested: "review",
        inputSchema: {},
        price: 100,
      });
    expect(res.status).toBe(401);
  });

  it("rejects when caller doesn't own the buyer agent (BOLA protection)", async () => {
    mockAuthenticatedKey();
    prismaMock.agent.findUnique.mockResolvedValue({
      id: "buyer-1",
      ownerId: "different-owner",
    });

    const res = await request(app)
      .post("/tasks")
      .set("X-API-Key", VALID_KEY)
      .send({
        buyerAgentId: "buyer-1",
        capabilityRequested: "review",
        inputSchema: {},
        price: 100,
      });
    expect(res.status).toBe(403);
  });

  it("creates task when caller owns buyer agent and has write scope", async () => {
    mockAuthenticatedKey();
    prismaMock.agent.findUnique.mockResolvedValue({
      id: "buyer-1",
      ownerId: "owner-alice",
    });
    prismaMock.taskContract.create.mockResolvedValue({
      id: "task-1",
      buyerAgentId: "buyer-1",
      status: "OPEN",
      price: 100,
      currency: "USD",
      timeoutMs: 300000,
      expiresAt: new Date(Date.now() + 300000),
      capabilityRequested: "review",
    });
    prismaMock.transaction.create.mockResolvedValue({ id: "tx-1", escrowStatus: "HELD" });

    const res = await request(app)
      .post("/tasks")
      .set("X-API-Key", VALID_KEY)
      .send({
        buyerAgentId: "buyer-1",
        capabilityRequested: "review",
        inputSchema: {},
        price: 100,
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("task-1");
  });
});

describe("GET /tasks (auth required, scoped to caller)", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(401);
  });

  it("returns caller's tasks with valid key", async () => {
    mockAuthenticatedKey();
    prismaMock.agent.findMany.mockResolvedValue([{ id: "a-1" }]);
    prismaMock.taskContract.findMany.mockResolvedValue([]);
    prismaMock.taskContract.count.mockResolvedValue(0);

    const res = await request(app)
      .get("/tasks")
      .set("X-API-Key", VALID_KEY);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
});

// ─── API Keys ────────────────────────────────────────────────────────────────

describe("API Keys endpoints", () => {
  it("GET /api-keys lists keys for authenticated owner", async () => {
    mockAuthenticatedKey();
    prismaMock.apiKey.findMany.mockResolvedValue([
      {
        id: "k-1",
        keyPrefix: "cb_abc",
        label: "test",
        agentId: null,
        scopes: ["read", "write"],
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
        createdAt: new Date(),
      },
    ]);

    const res = await request(app).get("/api-keys").set("X-API-Key", VALID_KEY);
    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
  });

  it("POST /api-keys creates a new key", async () => {
    mockAuthenticatedKey();
    prismaMock.apiKey.create.mockResolvedValue({
      id: "k-new",
      keyPrefix: "cb_new12345",
      label: "new",
      agentId: null,
      scopes: ["read"],
      lastUsedAt: null,
      expiresAt: null,
      revoked: false,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/api-keys")
      .set("X-API-Key", VALID_KEY)
      .send({ label: "new", scopes: ["read"] });

    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^cb_/);
    expect(res.body.keyInfo).toBeDefined();
  });

  it("DELETE /api-keys/:id revokes an owned key", async () => {
    mockAuthenticatedKey();
    // First lookup: authenticating the caller's key (VALID_KEY_HASH)
    // Second lookup: the key being revoked
    prismaMock.apiKey.findUnique
      .mockResolvedValueOnce({
        id: "key-1", ownerId: "owner-alice", scopes: ["read", "write"],
        keyHash: VALID_KEY_HASH, revoked: false, expiresAt: null, agentId: null,
      })
      .mockResolvedValueOnce({
        id: "k-to-revoke", ownerId: "owner-alice", revoked: false,
      });

    prismaMock.apiKey.update.mockResolvedValue({
      id: "k-to-revoke",
      keyPrefix: "cb_xyz",
      label: "old",
      agentId: null,
      scopes: ["read"],
      lastUsedAt: null,
      expiresAt: null,
      revoked: true,
      createdAt: new Date(),
    });

    const res = await request(app)
      .delete("/api-keys/k-to-revoke")
      .set("X-API-Key", VALID_KEY);

    expect(res.status).toBe(200);
    expect(res.body.key.revoked).toBe(true);
  });

  it("DELETE /api-keys/:id rejects revoking someone else's key", async () => {
    mockAuthenticatedKey();
    prismaMock.apiKey.findUnique
      .mockResolvedValueOnce({
        id: "key-1", ownerId: "owner-alice", scopes: ["read", "write"],
        keyHash: VALID_KEY_HASH, revoked: false, expiresAt: null, agentId: null,
      })
      .mockResolvedValueOnce({
        id: "k-other", ownerId: "owner-bob", revoked: false,
      });

    const res = await request(app)
      .delete("/api-keys/k-other")
      .set("X-API-Key", VALID_KEY);

    expect(res.status).toBe(403);
  });
});

// ─── Error shapes ────────────────────────────────────────────────────────────

describe("Error responses", () => {
  it("404 has proper error shape", async () => {
    mockAuthenticatedKey();
    prismaMock.taskContract.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/tasks/nonexistent")
      .set("X-API-Key", VALID_KEY);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
