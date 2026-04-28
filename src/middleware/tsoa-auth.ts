import { Request } from "express";
import { hashApiKey } from "../utils/hash";
import { AuthenticatedRequest, SESSION_COOKIE_NAME } from "./auth";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import prisma from "../utils/prisma";
import { authService } from "../services/auth.service";

type CookieRequest = Request & { cookies?: Record<string, string | undefined> };

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === "api_key") {
    const key = request.header("X-API-Key");
    if (!key) throw new UnauthorizedError("Missing X-API-Key header");

    const keyHash = hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

    if (!apiKey || apiKey.revoked) throw new UnauthorizedError("Invalid or revoked API key");
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new UnauthorizedError("Expired API key");

    if (scopes && scopes.length > 0) {
      const missingScopes = scopes.filter((s) => !apiKey.scopes.includes(s));
      if (missingScopes.length > 0) {
        throw new ForbiddenError(`Insufficient permissions. Missing scopes: ${missingScopes.join(", ")}`);
      }
    }

    (request as AuthenticatedRequest).apiKey = {
      id: apiKey.id,
      ownerId: apiKey.ownerId,
      agentId: apiKey.agentId,
      scopes: apiKey.scopes,
    };

    return apiKey;
  }

  if (securityName === "session") {
    const cookieToken = (request as CookieRequest).cookies?.[SESSION_COOKIE_NAME];
    const user = await authService.resolveSession(cookieToken);
    if (!user) throw new UnauthorizedError("Not signed in");

    if (scopes && scopes.length > 0) {
      const requiredRoles = scopes.map((s) => s.toUpperCase());
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenError(`Insufficient role. Required one of: ${requiredRoles.join(", ")}`);
      }
    }

    (request as AuthenticatedRequest).user = user;
    return user;
  }

  throw new UnauthorizedError(`Unsupported security: ${securityName}`);
}
