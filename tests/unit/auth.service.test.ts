import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../mocks/prisma";

vi.mock("../../src/utils/prisma", () => ({ default: prismaMock }));

import { AuthService } from "../../src/services/auth.service";
import { hashOpaqueToken } from "../../src/utils/hash";
import { UnauthorizedError, ValidationError } from "../../src/utils/errors";

const fakeUser = {
  id: "u-1",
  email: "alice@example.com",
  name: "Alice",
  role: "USER" as const,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  describe("upsertUserByEmail", () => {
    it("normalizes case + whitespace before lookup", async () => {
      prismaMock.user.upsert.mockResolvedValue(fakeUser);

      const result = await service.upsertUserByEmail("  Alice@Example.COM ");

      expect(prismaMock.user.upsert).toHaveBeenCalledWith({
        where: { email: "alice@example.com" },
        update: {},
        create: { email: "alice@example.com", name: null },
      });
      expect(result.email).toBe("alice@example.com");
    });

    it("rejects malformed addresses", async () => {
      await expect(service.upsertUserByEmail("not-an-email")).rejects.toThrow(ValidationError);
      expect(prismaMock.user.upsert).not.toHaveBeenCalled();
    });
  });

  describe("issueMagicLink", () => {
    it("hashes the token before persisting and never returns the hash", async () => {
      prismaMock.user.upsert.mockResolvedValue(fakeUser);
      prismaMock.magicLinkToken.create.mockResolvedValue({});

      const issued = await service.issueMagicLink("alice@example.com");

      expect(issued.token).toMatch(/^cbm_[0-9a-f]{64}$/);
      const persistedHash = prismaMock.magicLinkToken.create.mock.calls[0][0].data.tokenHash;
      expect(persistedHash).toBe(hashOpaqueToken(issued.token));
      expect(persistedHash).not.toBe(issued.token);
      expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("consumeMagicLink", () => {
    it("rejects unknown tokens", async () => {
      prismaMock.magicLinkToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.consumeMagicLink("cbm_nope")).rejects.toThrow(UnauthorizedError);
    });

    it("rejects empty tokens without hitting the DB", async () => {
      await expect(service.consumeMagicLink("")).rejects.toThrow(UnauthorizedError);
      expect(prismaMock.magicLinkToken.updateMany).not.toHaveBeenCalled();
    });

    it("marks the token consumed atomically and returns the user", async () => {
      prismaMock.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.magicLinkToken.findUnique.mockResolvedValue({
        id: "t-1",
        userId: fakeUser.id,
        user: fakeUser,
      });

      const user = await service.consumeMagicLink("cbm_abc123");

      const updateCall = prismaMock.magicLinkToken.updateMany.mock.calls[0][0];
      expect(updateCall.where).toMatchObject({
        consumedAt: null,
        expiresAt: { gt: expect.any(Date) },
      });
      expect(updateCall.data.consumedAt).toBeInstanceOf(Date);
      expect(user.id).toBe(fakeUser.id);
    });

    it("a second concurrent consumption fails", async () => {
      prismaMock.magicLinkToken.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      prismaMock.magicLinkToken.findUnique.mockResolvedValue({ user: fakeUser });

      await expect(service.consumeMagicLink("cbm_token")).resolves.toBeDefined();
      await expect(service.consumeMagicLink("cbm_token")).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("session lifecycle", () => {
    it("createSession persists the hash, returns the plaintext, and stamps lastUsedAt", async () => {
      prismaMock.session.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "s-1", ...data, user: fakeUser })
      );

      const session = await service.createSession(fakeUser.id, {
        userAgent: "Mozilla/5.0",
        ipAddress: "127.0.0.1",
      });

      expect(session.token).toMatch(/^cbs_[0-9a-f]{64}$/);
      const persisted = prismaMock.session.create.mock.calls[0][0].data;
      expect(persisted.tokenHash).toBe(hashOpaqueToken(session.token));
      expect(persisted.userAgent).toBe("Mozilla/5.0");
      expect(persisted.ipAddress).toBe("127.0.0.1");
      expect(persisted.lastUsedAt).toBeInstanceOf(Date);
    });

    it("resolveSession returns null for missing cookie / unknown / revoked / expired", async () => {
      // missing cookie
      expect(await service.resolveSession(undefined)).toBeNull();
      expect(prismaMock.session.findUnique).not.toHaveBeenCalled();

      // unknown
      prismaMock.session.findUnique.mockResolvedValueOnce(null);
      expect(await service.resolveSession("cbs_unknown")).toBeNull();

      // revoked
      prismaMock.session.findUnique.mockResolvedValueOnce({
        id: "s-1",
        userId: fakeUser.id,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        user: fakeUser,
      });
      expect(await service.resolveSession("cbs_revoked")).toBeNull();

      // expired
      prismaMock.session.findUnique.mockResolvedValueOnce({
        id: "s-1",
        userId: fakeUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: fakeUser,
      });
      expect(await service.resolveSession("cbs_expired")).toBeNull();
    });

    it("resolveSession returns the user and slides lastUsedAt", async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: fakeUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: fakeUser,
      });
      prismaMock.session.update.mockResolvedValue({});

      const user = await service.resolveSession("cbs_good");

      expect(user?.id).toBe(fakeUser.id);
      // lastUsedAt update is fire-and-forget — drain microtasks before asserting.
      await new Promise((r) => setImmediate(r));
      expect(prismaMock.session.update).toHaveBeenCalledWith({
        where: { id: "s-1" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it("revokeSession sets revokedAt only on still-active rows", async () => {
      prismaMock.session.updateMany.mockResolvedValue({ count: 1 });
      await service.revokeSession("cbs_x");
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashOpaqueToken("cbs_x"), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
