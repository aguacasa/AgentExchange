import { z, type ZodRawShape } from "zod";
import type { CallboardClient } from "./callboard.js";
import { query } from "./callboard.js";
import type { Config } from "./config.js";

// ─── Tool type ─────────────────────────────────────────────────────────────
// Each tool colocates its name, description, zod schema, and handler.
// The handler's `args` type is inferred from the schema — no casts, no
// Record<string, unknown>.

export interface ToolDef<S extends ZodRawShape> {
  name: string;
  description: string;
  inputSchema: S;
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}

function tool<S extends ZodRawShape>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

interface Task {
  id: string;
  status: string;
  sellerAgentId?: string | null;
  outputData?: unknown;
  verificationResult?: unknown;
}

const TASK_STATUSES = [
  "OPEN",
  "ACCEPTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "VERIFYING",
  "COMPLETED",
  "FAILED",
  "DISPUTED",
  "CANCELLED",
  "EXPIRED",
] as const;

const TERMINAL_STATUSES = new Set<string>([
  "SUBMITTED",
  "COMPLETED",
  "FAILED",
  "DISPUTED",
  "EXPIRED",
  "CANCELLED",
]);

const taskStatus = z.enum(TASK_STATUSES);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function buildTools(client: CallboardClient, config: Config) {
  return [
    tool({
      name: "find_agents",
      description:
        "Search the Callboard registry for agents by capability. Use this before posting a task " +
        "to see what sellers are available. Returns active agents sorted by reputation.",
      inputSchema: {
        capability: z.string().describe("Capability tag, e.g. 'translation' or 'code-review'"),
        maxPrice: z.number().int().positive().optional().describe("Max price per task in cents"),
        minReputation: z.number().min(0).max(100).optional().describe("Minimum 0-100 reputation score"),
        limit: z.number().int().positive().max(50).optional().describe("Max results (default 10)"),
      },
      handler: async (args) =>
        client.get(
          `/agents${query({
            capability: args.capability,
            maxPrice: args.maxPrice,
            minReputation: args.minReputation,
            limit: args.limit,
          })}`
        ),
    }),

    tool({
      name: "rank_agents",
      description:
        "Rank agents for a capability by the Callboard matching score (capability fit + reputation + " +
        "price + response time + uptime). Prefer this over find_agents when you want the 'best' match.",
      inputSchema: {
        capability: z.string(),
        maxPrice: z.number().int().positive().optional(),
        minReputation: z.number().min(0).max(100).optional(),
        maxResponseMs: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(20).optional(),
      },
      handler: async (args) => client.post("/agents/match", args),
    }),

    tool({
      name: "get_agent_card",
      description:
        "Fetch a single agent's Agent Card (A2A-compatible). Use to inspect pricing, sample " +
        "input/output, and SLA before transacting.",
      inputSchema: { agentId: z.string() },
      handler: async (args) => client.get(`/agents/${args.agentId}`),
    }),

    tool({
      name: "post_task",
      description:
        "Post a new task contract. Funds are held in escrow the moment this returns. " +
        "The caller must own the buyer agent (set via CALLBOARD_BUYER_AGENT_ID in the MCP config; " +
        "do not override unless the user has multiple buyer agents).",
      inputSchema: {
        capabilityRequested: z.string().describe("Capability tag matching a seller's capabilities"),
        inputSchema: z
          .record(z.unknown())
          .describe("JSON Schema describing the input shape (pass {} if free-form)"),
        inputData: z
          .record(z.unknown())
          .optional()
          .describe("The actual payload the seller will operate on"),
        qualityCriteria: z
          .record(z.unknown())
          .optional()
          .describe("Optional JSON describing what a good output looks like"),
        price: z.number().int().positive().describe("Price in cents; must be a positive integer"),
        currency: z.string().optional().describe("ISO currency (default USD)"),
        timeoutMs: z.number().int().positive().max(86_400_000).optional(),
        buyerAgentIdOverride: z
          .string()
          .optional()
          .describe("Override the configured buyer agent ID. Rare."),
      },
      handler: async (args) => {
        const { buyerAgentIdOverride, ...rest } = args;
        return client.post("/tasks", {
          buyerAgentId: buyerAgentIdOverride ?? config.buyerAgentId,
          ...rest,
        });
      },
    }),

    tool({
      name: "wait_for_submission",
      description:
        "Poll a task until a seller submits work (status=SUBMITTED) or the timeout elapses. " +
        "Returns the task if SUBMITTED, or a timeout marker you can retry. Never blocks longer than " +
        "waitMs (default 60s). Call verify_task next with passed=true/false.",
      inputSchema: {
        taskId: z.string(),
        waitMs: z
          .number()
          .int()
          .positive()
          .max(300_000)
          .optional()
          .describe("Max wait in ms (default 60000, max 300000)"),
      },
      handler: async (args) => {
        const deadline = Date.now() + (args.waitMs ?? config.defaultWaitMs);
        let task: Task | null = null;
        let pollMs = 1_000;
        while (true) {
          task = await client.get<Task>(`/tasks/${args.taskId}`);
          if (TERMINAL_STATUSES.has(task.status)) return task;
          const remaining = deadline - Date.now();
          if (remaining <= 0) break;
          await sleep(Math.min(pollMs, remaining));
          pollMs = Math.min(pollMs * 1.5, 5_000);
        }
        return { timedOut: true, lastStatus: task?.status ?? "unknown", taskId: args.taskId };
      },
    }),

    tool({
      name: "verify_task",
      description:
        "Verify the submitted output. passed=true releases escrow to the seller and bumps " +
        "reputation; passed=false refunds the buyer. Apply your own judgment on the output before " +
        "calling — that's why this is a separate tool from wait_for_submission.",
      inputSchema: {
        taskId: z.string(),
        passed: z.boolean(),
        verificationResult: z
          .record(z.unknown())
          .optional()
          .describe("Optional notes, e.g. { qualityScore: 90, reason: '...' }"),
      },
      handler: async (args) => {
        const { taskId, ...body } = args;
        return client.post(`/tasks/${taskId}/verify`, body);
      },
    }),

    tool({
      name: "dispute_task",
      description:
        "Raise a dispute on a task that's IN_PROGRESS or SUBMITTED. Freezes escrow until a " +
        "human resolves. Use when the output is unusable and you don't want to unilaterally fail it.",
      inputSchema: {
        taskId: z.string(),
        reason: z.string().min(1),
      },
      handler: async (args) =>
        client.post(`/tasks/${args.taskId}/dispute`, { reason: args.reason }),
    }),

    tool({
      name: "list_my_tasks",
      description:
        "List the caller's tasks (scoped to the configured buyer agent's owner). Useful for 'what " +
        "jobs do I have running?' or finding a task ID the user referenced.",
      inputSchema: {
        status: taskStatus.optional(),
        limit: z.number().int().positive().max(100).optional(),
      },
      handler: async (args) =>
        client.get(`/tasks${query({ status: args.status, limit: args.limit })}`),
    }),
  ];
}

export const TOOL_NAMES = [
  "find_agents",
  "rank_agents",
  "get_agent_card",
  "post_task",
  "wait_for_submission",
  "verify_task",
  "dispute_task",
  "list_my_tasks",
] as const;
