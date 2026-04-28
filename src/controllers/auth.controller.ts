import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import type { Express, Response as ExpressResponse, Request as ExpressRequest } from "express";
import { authService, PublicUser, SESSION_TTL_MS } from "../services/auth.service";
import { sendMagicLinkEmail } from "../services/email.service";
import { SESSION_COOKIE_NAME, AuthenticatedRequest } from "../middleware/auth";
import { UnauthorizedError, ValidationError } from "../utils/errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MagicLinkRequest {
  email: string;
}

interface VerifyRequest {
  token: string;
}

interface AuthAcceptedResponse {
  status: "accepted";
}

interface MeResponse {
  user: PublicUser;
}

interface LogoutResponse {
  status: "ok";
}

function webOrigin(): string {
  const fromEnv = process.env.WEB_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // CORS_ORIGINS is a fallback so dev (which only sets CORS_ORIGINS) still works.
  const cors = process.env.CORS_ORIGINS?.split(",")[0]?.trim();
  return (cors || "http://localhost:3001").replace(/\/$/, "");
}

function getResponse(req: Express.Request): ExpressResponse | undefined {
  return (req as ExpressRequest).res;
}

function setSessionCookie(req: Express.Request, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAgeSec}`,
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  getResponse(req)?.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(req: Express.Request): void {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  getResponse(req)?.setHeader("Set-Cookie", parts.join("; "));
}

@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
  /**
   * Issue a magic-link email. Always 202, regardless of whether the email
   * exists — prevents account-enumeration. The link is logged to stdout in
   * dev (no real email provider yet); see VIS-79 for the production email
   * follow-up.
   */
  @Post("magic-link")
  @SuccessResponse(202, "Magic link sent if account exists")
  public async requestMagicLink(@Body() body: MagicLinkRequest): Promise<AuthAcceptedResponse> {
    // Format check up front so a typo gets a useful 400 instead of a
    // misleading 202. The anti-enumeration guarantee only needs to hold once
    // the email is well-formed.
    if (!body?.email || typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
      throw new ValidationError("Invalid email address");
    }
    this.setStatus(202);
    try {
      const issued = await authService.issueMagicLink(body.email);
      const callbackUrl = `${webOrigin()}/auth/callback?token=${encodeURIComponent(issued.token)}`;
      await sendMagicLinkEmail({
        to: issued.user.email,
        callbackUrl,
        expiresAt: issued.expiresAt,
      });
    } catch (err) {
      // Don't leak whether the email is registered. Log so real DB outages
      // still show up in monitoring.
      console.error("[auth] magic-link issue failed:", err instanceof Error ? err.message : err);
    }
    return { status: "accepted" };
  }

  /**
   * Exchange a magic-link token for a session. Sets the cb_session cookie
   * and returns the authenticated user.
   */
  @Post("verify")
  public async verifyMagicLink(
    @Body() body: VerifyRequest,
    @Request() req: Express.Request
  ): Promise<MeResponse> {
    if (!body?.token) {
      throw new UnauthorizedError("Invalid or expired magic link");
    }
    const user = await authService.consumeMagicLink(body.token);
    const xreq = req as ExpressRequest;
    const session = await authService.createSession(user.id, {
      userAgent: xreq.header("User-Agent") ?? null,
      ipAddress: xreq.ip ?? null,
    });
    setSessionCookie(req, session.token);
    return { user };
  }

  /**
   * Returns the currently signed-in user. 401 if no session.
   */
  @Get("me")
  @Security("session")
  public async me(@Request() req: Express.Request): Promise<MeResponse> {
    const authReq = req as unknown as AuthenticatedRequest;
    if (!authReq.user) {
      throw new UnauthorizedError("Not signed in");
    }
    return { user: authReq.user };
  }

  /**
   * Revoke the current session and clear the cookie.
   */
  @Post("logout")
  @Security("session")
  public async logout(@Request() req: Express.Request): Promise<LogoutResponse> {
    const cookieToken = (req as Express.Request & { cookies?: Record<string, string> })
      .cookies?.[SESSION_COOKIE_NAME];
    await authService.revokeSession(cookieToken);
    clearSessionCookie(req);
    return { status: "ok" };
  }
}
