import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";

// DSN-gated: production sets SENTRY_DSN in Coolify; dev/test leaves it unset
// and Sentry stays a no-op. Init must happen before route registration so
// setupExpressErrorHandler later in the file can hook into the right handlers.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
  });
}

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./generated/routes";
import { errorHandler } from "./middleware/errorHandler";
import { startExpireStaleTasksJob } from "./jobs/expireStaleTasks";
import { validateProdEnv } from "./config/env";

validateProdEnv();

const app = express();

// Production sits behind Cloudflare → Traefik → app. Trust exactly one hop
// (Traefik) so express-rate-limit keys off the real client IP from
// X-Forwarded-For instead of bucketing all traffic under Traefik's container IP.
app.set("trust proxy", 1);

// Middleware
app.use(helmet());

// CORS — restrict origins in production
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  // credentials:true is required so the browser sends the cb_session cookie
  // on cross-origin dashboard → API calls (web at :3001 → API at :3000 in dev,
  // and web.getcallboard.com → api.getcallboard.com in prod).
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization"],
}));

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter store: Redis when available (survives deploys, shared across
// replicas), in-memory fallback for local dev + tests.
let redisClient: Redis | null = null;
if (process.env.REDIS_URL && process.env.NODE_ENV !== "test") {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
  });
  redisClient.on("error", (err) => {
    console.error("[redis] rate limiter connection error:", err.message);
  });
}

function makeLimiter(key: string, windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message } },
    ...(redisClient && {
      store: new RedisStore({
        sendCommand: (command: string, ...args: string[]) =>
          redisClient!.call(command, ...args) as Promise<any>,
        prefix: `rl:${key}:`,
      }),
    }),
  });
}

const apiLimiter = makeLimiter("api", 15 * 60 * 1000, 100, "Too many requests, please try again later");
app.use("/agents", apiLimiter);
app.use("/tasks", apiLimiter);
app.use("/api-keys", apiLimiter);

const waitlistLimiter = makeLimiter("waitlist", 60 * 60 * 1000, 5, "Too many waitlist submissions, please try again later");
app.use("/waitlist", waitlistLimiter);

// Tighter limiter on /auth/* — magic-link issue is the main brute-force /
// enumeration target. 10 requests per IP per 15 min covers a careful user
// retrying typos but rejects scripted abuse.
const authLimiter = makeLimiter("auth", 15 * 60 * 1000, 10, "Too many auth requests, please try again later");
app.use("/auth", authLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "callboard", version: "0.1.0" });
});

// Register tsoa-generated routes
RegisterRoutes(app);

// Swagger UI — serve generated OpenAPI spec
try {
  const spec = require("../generated/swagger.json");
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/openapi.json", (_req, res) => res.json(spec));
} catch {
  console.warn("OpenAPI spec not generated yet. Run `npm run spec` first.");
}

// Sentry's Express error handler must be registered after routes but before
// our own error handler so it can capture exceptions before they're normalized.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Error handler (must be after routes)
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`
  ┌─────────────────────────────────────────┐
  │                                         │
  │   Callboard API v0.1.0                  │
  │   http://localhost:${PORT}                 │
  │   Docs: http://localhost:${PORT}/docs      │
  │   Spec: http://localhost:${PORT}/openapi.json │
  │                                         │
  └─────────────────────────────────────────┘
    `);
    if (process.env.WORKER_DISABLED === "true") {
      console.log("[server] inline background worker disabled — run `npm run start:worker` separately");
    } else {
      startExpireStaleTasksJob();
    }
  });
}

export default app;
