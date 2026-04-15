import {
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Path,
  Body,
  Tags,
  Security,
  Request,
  SuccessResponse,
} from "tsoa";
import { apiKeyService, ApiKeyInfo } from "../services/apikey.service";
import { ForbiddenError } from "../utils/errors";
import { AuthenticatedRequest } from "../middleware/auth";
import { Express } from "express";

function getCallerId(req: Express.Request): string {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.apiKey?.ownerId) {
    throw new ForbiddenError("Authentication required");
  }
  return authReq.apiKey.ownerId;
}

interface CreateApiKeyBody {
  label?: string;
  agentId?: string;
  scopes?: string[];
}

@Route("api-keys")
@Tags("API Keys")
export class ApiKeyController extends Controller {
  /**
   * List all API keys for the authenticated owner.
   * Key hashes are never returned — only prefixes and metadata.
   */
  @Get()
  @Security("api_key", ["read"])
  public async listKeys(
    @Request() req: Express.Request
  ): Promise<{ keys: ApiKeyInfo[] }> {
    const ownerId = getCallerId(req);
    const keys = await apiKeyService.listByOwner(ownerId);
    return { keys };
  }

  /**
   * Create a new API key.
   * Returns the full key ONCE — store it securely, it cannot be retrieved again.
   */
  @Post()
  @Security("api_key", ["write"])
  @SuccessResponse(201, "API key created")
  public async createKey(
    @Body() body: CreateApiKeyBody,
    @Request() req: Express.Request
  ): Promise<{ keyInfo: ApiKeyInfo; key: string }> {
    this.setStatus(201);
    const ownerId = getCallerId(req);
    return apiKeyService.create({
      ownerId,
      agentId: body.agentId,
      label: body.label,
      scopes: body.scopes,
    });
  }

  /**
   * Revoke an API key. The key will immediately stop working.
   */
  @Delete("{keyId}")
  @Security("api_key", ["write"])
  public async revokeKey(
    @Path() keyId: string,
    @Request() req: Express.Request
  ): Promise<{ key: ApiKeyInfo; message: string }> {
    const ownerId = getCallerId(req);
    const key = await apiKeyService.revoke(keyId, ownerId);
    return { key, message: "API key revoked successfully" };
  }
}
