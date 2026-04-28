import prisma from "../utils/prisma";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/hash";
import { UnauthorizedError, ValidationError } from "../utils/errors";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: Date;
}

export interface IssuedMagicLink {
  // Plaintext token. Returned only at issue time so we can email it.
  // Never stored anywhere except the email itself.
  token: string;
  expiresAt: Date;
  user: PublicUser;
}

export interface IssuedSession {
  // Plaintext session token. Returned only at issue time so it can ride in
  // the Set-Cookie header. The DB only stores its hash.
  token: string;
  expiresAt: Date;
  user: PublicUser;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    throw new ValidationError("Invalid email address");
  }
  return trimmed;
}

function toPublicUser(u: {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: Date;
}): PublicUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
}

export class AuthService {
  /**
   * Idempotent — returns the existing user when the email already exists,
   * otherwise creates a new USER-role row. Email uniqueness is enforced at
   * the DB level so this is safe under concurrent calls.
   */
  async upsertUserByEmail(rawEmail: string, name?: string): Promise<PublicUser> {
    const email = normalizeEmail(rawEmail);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: name ?? null },
    });
    return toPublicUser(user);
  }

  /**
   * Issue a magic-link token. Single-use, hashed at rest, 15 min TTL.
   * Returns the plaintext token so the caller can email it.
   */
  async issueMagicLink(rawEmail: string): Promise<IssuedMagicLink> {
    const user = await this.upsertUserByEmail(rawEmail);
    const { token, hash } = generateOpaqueToken("cbm");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await prisma.magicLinkToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    });

    return { token, expiresAt, user };
  }

  /**
   * Verify a magic-link token and atomically mark it consumed. Throws on
   * unknown / expired / already-consumed tokens with the same opaque error
   * to avoid leaking which case applied.
   */
  async consumeMagicLink(rawToken: string): Promise<PublicUser> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new UnauthorizedError("Invalid or expired magic link");
    }
    const tokenHash = hashOpaqueToken(rawToken);

    // updateMany with a guard on consumedAt + expiresAt makes this atomic:
    // a second concurrent call sees count=0 and rejects.
    const now = new Date();
    const updated = await prisma.magicLinkToken.updateMany({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });

    if (updated.count === 0) {
      throw new UnauthorizedError("Invalid or expired magic link");
    }

    const record = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record) {
      throw new UnauthorizedError("Invalid or expired magic link");
    }

    return toPublicUser(record.user);
  }

  async createSession(
    userId: string,
    meta: { userAgent?: string | null; ipAddress?: string | null } = {}
  ): Promise<IssuedSession> {
    const { token, hash } = generateOpaqueToken("cbs");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = await prisma.session.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        lastUsedAt: new Date(),
      },
      include: { user: true },
    });

    return { token, expiresAt, user: toPublicUser(session.user) };
  }

  /**
   * Look up a session by its plaintext cookie value. Returns null on any
   * missing / expired / revoked condition — callers convert that to 401.
   * Sliding `lastUsedAt` is best-effort; we swallow update failures so a
   * read can never 500 because of a concurrent revoke.
   */
  async resolveSession(rawToken: string | undefined): Promise<PublicUser | null> {
    if (!rawToken) return null;
    const tokenHash = hashOpaqueToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt <= new Date()) return null;

    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return toPublicUser(session.user);
  }

  async revokeSession(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashOpaqueToken(rawToken);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authService = new AuthService();
