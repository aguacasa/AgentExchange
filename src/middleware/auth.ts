import { Request } from "express";
import type { PublicUser } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    ownerId: string;
    agentId: string | null;
    scopes: string[];
  };
  user?: PublicUser;
}

export const SESSION_COOKIE_NAME = "cb_session";
