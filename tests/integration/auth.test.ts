/**
 * End-to-end HTTP test for the magic-link → session flow.
 * Uses supertest with prisma fully mocked, so it covers route wiring,
 * the new session security scheme, cookie set/clear, and the controller's
 * anti-enumeration behavior without touching a real DB.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));
vi.mock("../../src/jobs/expireStaleTasks", () => ({
  startExpireStaleTasksJob: vi.fn(),
}));

process.env.NODE_ENV = "test";

import request from "supertest";
import app from "../../src/server";
import { hashOpaqueToken } from "../../src/utils/hash";

const fakeUser = {
  id: "u-1",
  email: "alice@example.com",
  name: "Alice",
  role: "USER" as const,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /auth/magic-link", () => {
  it("returns 202 for a well-formed email and persists a hashed token", async () => {
    prismaMock.user.upsert.mockResolvedValue(fakeUser);
    prismaMock.magicLinkToken.create.mockResolvedValue({});

    const res = await request(app)
      .post("/auth/magic-link")
      .send({ email: "Alice@Example.COM" });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("accepted");
    const persistedHash = prismaMock.magicLinkToken.create.mock.calls[0][0].data.tokenHash;
    expect(persistedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects malformed addresses with 400 (no enumeration risk on garbage)", async () => {
    const res = await request(app).post("/auth/magic-link").send({ email: "asdf" });
    expect(res.status).toBe(400);
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });

  it("returns 202 even when the upstream upsert fails (anti-enumeration)", async () => {
    prismaMock.user.upsert.mockRejectedValue(new Error("db down"));

    const res = await request(app)
      .post("/auth/magic-link")
      .send({ email: "alice@example.com" });

    expect(res.status).toBe(202);
  });
});

describe("POST /auth/verify", () => {
  it("rejects an unknown / expired token with 401", async () => {
    prismaMock.magicLinkToken.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(app).post("/auth/verify").send({ token: "cbm_fake" });
    expect(res.status).toBe(401);
  });

  it("on success: sets a HttpOnly session cookie and returns the user", async () => {
    prismaMock.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.magicLinkToken.findUnique.mockResolvedValue({
      id: "t-1",
      userId: fakeUser.id,
      user: fakeUser,
    });
    prismaMock.session.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "s-1", ...data, user: fakeUser })
    );

    const res = await request(app).post("/auth/verify").send({ token: "cbm_good" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(fakeUser.email);

    const setCookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toMatch(/^cb_session=cbs_[0-9a-f]{64}/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });
});

describe("GET /auth/me", () => {
  it("401s without a session cookie", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the user when the cookie maps to a live session", async () => {
    const cookieToken = "cbs_session_value";
    prismaMock.session.findUnique.mockResolvedValue({
      id: "s-1",
      userId: fakeUser.id,
      tokenHash: hashOpaqueToken(cookieToken),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: fakeUser,
    });
    prismaMock.session.update.mockResolvedValue({});

    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", [`cb_session=${cookieToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(fakeUser.email);
  });

  it("401s when the session is revoked", async () => {
    const cookieToken = "cbs_revoked";
    prismaMock.session.findUnique.mockResolvedValue({
      id: "s-1",
      userId: fakeUser.id,
      tokenHash: hashOpaqueToken(cookieToken),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: fakeUser,
    });

    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", [`cb_session=${cookieToken}`]);

    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("revokes the session and clears the cookie", async () => {
    const cookieToken = "cbs_logout";
    prismaMock.session.findUnique.mockResolvedValue({
      id: "s-1",
      userId: fakeUser.id,
      tokenHash: hashOpaqueToken(cookieToken),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: fakeUser,
    });
    prismaMock.session.update.mockResolvedValue({});
    prismaMock.session.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post("/auth/logout")
      .set("Cookie", [`cb_session=${cookieToken}`]);

    expect(res.status).toBe(200);
    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashOpaqueToken(cookieToken), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    const setCookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toMatch(/^cb_session=;/);
    expect(setCookie).toContain("Max-Age=0");
  });
});
