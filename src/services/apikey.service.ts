import prisma from "../utils/prisma";
import { generateApiKey, hashApiKey } from "../utils/hash";
import { ApiKey } from "../types/domain";
import { NotFoundError, ForbiddenError, ValidationError } from "../utils/errors";

export interface CreateApiKeyInput {
  ownerId: string;
  agentId?: string;
  label?: string;
  scopes?: string[];
}

export interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  label: string | null;
  agentId: string | null;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
  createdAt: Date;
}

export class ApiKeyService {
  /**
   * List all API keys for a given owner.
   * Never returns the key hash — only prefix and metadata.
   */
  async listByOwner(ownerId: string): Promise<ApiKeyInfo[]> {
    const keys = await prisma.apiKey.findMany({
      where: { ownerId },
      select: {
        id: true,
        keyPrefix: true,
        label: true,
        agentId: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return keys;
  }

  /**
   * Create a new API key for an owner.
   * Returns the full key ONCE — it cannot be retrieved again.
   */
  async create(input: CreateApiKeyInput): Promise<{ keyInfo: ApiKeyInfo; key: string }> {
    if (!input.ownerId) {
      throw new ValidationError("ownerId is required");
    }

    // If agentId is provided, verify the owner owns that agent
    if (input.agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: input.agentId },
        select: { ownerId: true },
      });
      if (!agent) throw new NotFoundError("Agent", input.agentId);
      if (agent.ownerId !== input.ownerId) {
        throw new ForbiddenError("You do not own this agent");
      }
    }

    const { key, prefix, hash } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        ownerId: input.ownerId,
        agentId: input.agentId || null,
        keyHash: hash,
        keyPrefix: prefix,
        label: input.label || "api-key",
        scopes: input.scopes ?? ["read", "write"],
      },
      select: {
        id: true,
        keyPrefix: true,
        label: true,
        agentId: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
    });

    return { keyInfo: apiKey, key };
  }

  /**
   * Revoke an API key. The key remains in the database but is marked as revoked.
   */
  async revoke(keyId: string, ownerId: string): Promise<ApiKeyInfo> {
    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!apiKey) throw new NotFoundError("ApiKey", keyId);
    if (apiKey.ownerId !== ownerId) {
      throw new ForbiddenError("You do not own this API key");
    }
    if (apiKey.revoked) {
      throw new ValidationError("API key is already revoked");
    }

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true },
      select: {
        id: true,
        keyPrefix: true,
        label: true,
        agentId: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
    });
    return updated;
  }
}

export const apiKeyService = new ApiKeyService();
