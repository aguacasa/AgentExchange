import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "./generated/routes";
import { errorHandler } from "./middleware/errorHandler";
import { startExpireStaleTasksJob } from "./jobs/expireStaleTasks";

const app = express();

// Middleware
app.use(helmet());

// CORS — restrict origins in production
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization"],
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" } },
});
app.use("/agents", apiLimiter);
app.use("/tasks", apiLimiter);
app.use("/api-keys", apiLimiter);

// Tighter rate limit for the public waitlist endpoint (no auth).
const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many waitlist submissions, please try again later" } },
});
app.use("/waitlist", waitlistLimiter);

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
    startExpireStaleTasksJob();
  });
}

export default app;
