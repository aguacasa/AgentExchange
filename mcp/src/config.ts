export interface Config {
  apiKey: string;
  buyerAgentId: string;
  baseUrl: string;
  defaultWaitMs: number;
}

export function loadConfig(): Config {
  const apiKey = process.env.CALLBOARD_API_KEY;
  const buyerAgentId = process.env.CALLBOARD_BUYER_AGENT_ID;
  const baseUrl = process.env.CALLBOARD_BASE_URL ?? "http://localhost:3000";
  const defaultWaitMs = Number(process.env.CALLBOARD_WAIT_MS ?? 60_000);

  const missing: string[] = [];
  if (!apiKey) missing.push("CALLBOARD_API_KEY");
  if (!buyerAgentId) missing.push("CALLBOARD_BUYER_AGENT_ID");

  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing.join(", ")}. ` +
        `Register a buyer agent in /dashboard and export its API key + ID.`
    );
  }

  return { apiKey: apiKey!, buyerAgentId: buyerAgentId!, baseUrl, defaultWaitMs };
}
