#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallboardClient, formatError } from "./callboard.js";
import { loadConfig } from "./config.js";
import { buildTools } from "./tools.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new CallboardClient(config);

  const server = new McpServer({ name: "callboard-mcp", version: "0.1.0" });

  // The SDK's registerTool has a cross-tool-incompatible generic; cast at the
  // boundary keeps the internal (tool-factory) types clean.
  for (const t of buildTools(client, config)) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.inputSchema },
      async (args: unknown) => {
        try {
          const result = await (t.handler as (a: unknown) => Promise<unknown>)(args);
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        } catch (e) {
          return {
            content: [{ type: "text" as const, text: formatError(e) }],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the MCP channel — log startup to stderr so it doesn't corrupt the protocol.
  console.error(`[callboard-mcp] connected to ${config.baseUrl} as buyer ${config.buyerAgentId}`);
}

main().catch((e) => {
  console.error(`[callboard-mcp] fatal:`, e);
  process.exit(1);
});
