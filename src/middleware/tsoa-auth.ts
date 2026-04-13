import { Request } from "express";
import { hashApiKey } from "../utils/hash";
import { AuthenticatedRequest } from "./auth";
import prisma from "../utils/prisma";

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === "api_key") {
    const key = request.header("X-API-Key");
    if (!key) throw new Error("Missing X-API-Key header");

    const keyHash = hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

    if (!apiKey || apiKey.revoked) throw new Error("Invalid or revoked API key");
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new Error("Expired API key");

    // Enforce scopes
    if (scopes && scopes.length > 0) {
      const missingScopes = scopes.filter((s) => !apiKey.scopes.includes(s));
      if (missingScopes.length > 0) {
        throw new Error(`Insufficient permissions. Missing scopes: ${missingScopes.join(", ")}`);
      }
    }

    // Attach to request for controllers
    (request as AuthenticatedRequest).apiKey = {
      id: apiKey.id,
      ownerId: apiKey.ownerId,
      agentId: apiKey.agentId,
      scopes: apiKey.scopes,
    };

    return apiKey;
  }

  throw new Error(`Unsupported security: ${securityName}`);
}
