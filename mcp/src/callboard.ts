import type { Config } from "./config.js";

export interface CallboardError {
  status: number;
  code: string;
  message: string;
}

function isCallboardError(x: unknown): x is CallboardError {
  return typeof x === "object" && x !== null && "status" in x && "code" in x;
}

export class CallboardClient {
  constructor(private config: Config) {}

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    opts: { auth?: boolean } = { auth: true }
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.auth !== false) headers["X-API-Key"] = this.config.apiKey;

    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const data = text ? (JSON.parse(text) as Record<string, unknown>) : ({} as Record<string, unknown>);

    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string } }).error ?? {};
      const error: CallboardError = {
        status: res.status,
        code: err.code ?? "UNKNOWN",
        message: err.message ?? res.statusText,
      };
      throw error;
    }

    return data as T;
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body: unknown) => this.request<T>("POST", path, body);
}

export function formatError(e: unknown): string {
  if (isCallboardError(e)) {
    return `Callboard ${e.status} ${e.code}: ${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
