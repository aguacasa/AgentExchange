/**
 * Smoke test for @callboard/mcp.
 *
 * Bootstraps a fresh seller + buyer on the live Callboard API, spawns the
 * MCP server as a subprocess over stdio, and exercises every tool through
 * the real MCP client — same protocol Claude Desktop / Claude Code uses.
 *
 * Prereqs:
 *   - Callboard API running on localhost:3000 (`npm run dev` from repo root)
 *   - mcp/ package built (`cd mcp && npm run build`)
 *
 * Run from mcp/: `npm run smoke`
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_NAMES } from "../src/tools.js";

const BASE = process.env.CALLBOARD_BASE_URL ?? "http://localhost:3000";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When run from dist/scripts/smoke.js, the compiled server sits at dist/src/server.js.
const SERVER_ENTRY = path.resolve(__dirname, "..", "src", "server.js");

let pass = 0;
let fail = 0;

function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function step(label: string): void {
  console.log(`\n\x1b[36m▸ ${label}\x1b[0m`);
}

interface BootstrapResult {
  agent: { id: string; capabilities: string[] };
  apiKey: string;
}

async function postAgent(body: Record<string, unknown>): Promise<BootstrapResult> {
  const res = await fetch(`${BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`bootstrap failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<BootstrapResult>;
}

interface McpTextResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

function parseText<T>(r: McpTextResult): T {
  if (r.isError) throw new Error(r.content[0]?.text ?? "mcp error");
  return JSON.parse(r.content[0]?.text ?? "null") as T;
}

async function main(): Promise<void> {
  const cap = `mcp-smoke-${process.pid}-${Math.floor(Math.random() * 1e6)}`;

  step("Pre-flight: bootstrap a seller + buyer on the live API");
  const [seller, buyer] = await Promise.all([
    postAgent({
      name: `MCP-Smoke-Seller-${process.pid}`,
      endpointUrl: "https://mcp-smoke.example.com/seller",
      capabilities: [cap],
      pricingModel: "PER_TASK",
      pricePerUnit: 100,
    }),
    postAgent({
      name: `MCP-Smoke-Buyer-${process.pid}`,
      endpointUrl: "https://mcp-smoke.example.com/buyer",
      capabilities: ["mcp-smoke-buyer"],
    }),
  ]);
  console.log(`  seller.id = ${seller.agent.id}`);
  console.log(`  buyer.id  = ${buyer.agent.id}`);

  // 3. Spawn the MCP server as a subprocess.
  step("Spawning @callboard/mcp via stdio");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_ENTRY],
    env: {
      ...process.env,
      CALLBOARD_API_KEY: buyer.apiKey,
      CALLBOARD_BUYER_AGENT_ID: buyer.agent.id,
      CALLBOARD_BASE_URL: BASE,
    },
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk: Buffer) => process.stderr.write(`[server] ${chunk}`));

  const client = new Client({ name: "callboard-smoke", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  ok("client connected", true);

  step("list_tools");
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  const expected = [...TOOL_NAMES].sort();
  ok(
    `exposes all ${expected.length} tools`,
    JSON.stringify(names) === JSON.stringify(expected),
    `got: ${names.join(",")}`
  );

  // 5. find_agents
  step("find_agents");
  const found = await client.callTool({ name: "find_agents", arguments: { capability: cap } });
  const agentsList = parseText<{ agents: { id: string }[] }>(found as McpTextResult);
  ok("found our seller via find_agents", agentsList.agents.some((a) => a.id === seller.agent.id));

  // 6. rank_agents
  step("rank_agents");
  const ranked = await client.callTool({
    name: "rank_agents",
    arguments: { capability: cap, maxPrice: 500 },
  });
  const rankedResp = parseText<{ matches: { agent: { id: string } }[] }>(ranked as McpTextResult);
  ok("seller is top ranked match", rankedResp.matches[0]?.agent?.id === seller.agent.id);

  // 7. get_agent_card
  step("get_agent_card");
  const card = await client.callTool({
    name: "get_agent_card",
    arguments: { agentId: seller.agent.id },
  });
  const cardResp = parseText<{ id: string; capabilities: { name: string }[] }>(card as McpTextResult);
  ok("card id matches", cardResp.id === seller.agent.id);
  ok("card carries capability", cardResp.capabilities.some((c) => c.name === cap));

  // 8. post_task
  step("post_task");
  const created = await client.callTool({
    name: "post_task",
    arguments: {
      capabilityRequested: cap,
      inputSchema: { type: "object" },
      inputData: { ping: "pong" },
      price: 100,
    },
  });
  const task = parseText<{ id: string; status: string }>(created as McpTextResult);
  ok("task posted", !!task.id);
  ok("task starts OPEN", task.status === "OPEN");

  // 9. Seller drives the task off OPEN (accept + submit) via REST so we can
  //    exercise wait_for_submission through the MCP layer.
  step("Seller accepts and submits (via REST)");
  async function sellerPost(path: string, body: Record<string, unknown>): Promise<void> {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": seller.apiKey },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${path} → ${r.status} ${await r.text()}`);
  }
  await sellerPost(`/tasks/${task.id}/accept`, { sellerAgentId: seller.agent.id });
  await sellerPost(`/tasks/${task.id}/submit`, {
    sellerAgentId: seller.agent.id,
    outputData: { answer: "ok" },
  });

  // 10. wait_for_submission
  step("wait_for_submission");
  const waited = await client.callTool({
    name: "wait_for_submission",
    arguments: { taskId: task.id, waitMs: 5000 },
  });
  const waitedResp = parseText<{ status?: string; outputData?: { answer?: string } }>(
    waited as McpTextResult
  );
  ok("wait returned SUBMITTED", waitedResp.status === "SUBMITTED");
  ok("output data visible", waitedResp.outputData?.answer === "ok");

  // 11. verify_task
  step("verify_task (pass=true → escrow released)");
  const verified = await client.callTool({
    name: "verify_task",
    arguments: { taskId: task.id, passed: true, verificationResult: { qualityScore: 95 } },
  });
  const verifiedResp = parseText<{ status: string }>(verified as McpTextResult);
  ok("task COMPLETED after verify", verifiedResp.status === "COMPLETED");

  // 12. list_my_tasks
  step("list_my_tasks");
  const listed = await client.callTool({
    name: "list_my_tasks",
    arguments: { limit: 10 },
  });
  const listedResp = parseText<{ tasks: { id: string }[] }>(listed as McpTextResult);
  ok(
    "our task appears in list_my_tasks",
    listedResp.tasks.some((t) => t.id === task.id)
  );

  // 13. Error surfacing — ask for an unknown agent card.
  step("Error surfacing (get_agent_card on unknown id)");
  const bad = (await client.callTool({
    name: "get_agent_card",
    arguments: { agentId: "00000000-0000-0000-0000-000000000000" },
  })) as McpTextResult;
  ok("isError=true on 404", bad.isError === true);
  ok("error body mentions NOT_FOUND", (bad.content[0]?.text ?? "").includes("NOT_FOUND"));

  await client.close();

  console.log(`\n─── Summary ───`);
  console.log(`  \x1b[32mpassed: ${pass}\x1b[0m`);
  console.log(`  \x1b[31mfailed: ${fail}\x1b[0m`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("smoke failed:", e);
  process.exit(1);
});
