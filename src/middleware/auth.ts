import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { hashApiKey } from "../utils/hash";
import { UnauthorizedError } from "../utils/errors";

export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    ownerId: string;
    agentId: string | null;
    scopes: string[];
  };
}

export async function authenticateApiKey(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.header("X-API-Key");
  if (!key) {
    return next(new UnauthorizedError("Missing X-API-Key header"));
  }

  const keyHash = hashApiKey(key);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey || apiKey.revoked) {
    return next(new UnauthorizedError("Invalid or revoked API key"));
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return next(new UnauthorizedError("API key has expired"));
  }

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  (req as AuthenticatedRequest).apiKey = {
    id: apiKey.id,
    ownerId: apiKey.ownerId,
    agentId: apiKey.agentId,
    scopes: apiKey.scopes,
  };

  next();
}

export function requireScope(scope: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.apiKey?.scopes.includes(scope)) {
      return next(new UnauthorizedError(`Missing required scope: ${scope}`));
    }
    next();
  };
}
