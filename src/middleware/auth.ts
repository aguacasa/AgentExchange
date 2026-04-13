import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    ownerId: string;
    agentId: string | null;
    scopes: string[];
  };
}
