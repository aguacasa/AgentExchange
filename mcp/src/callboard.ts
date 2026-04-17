import type { Config } from "./config.js";

export class CallboardError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "CallboardError";
  }
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

    // Empty bodies (e.g. 204) would make res.json() throw; round-trip through text first.
    const text = await res.text();
    const data: { error?: { code?: string; message?: string } } & Record<string, unknown> = text
      ? JSON.parse(text)
      : {};

    if (!res.ok) {
      throw new CallboardError(
        res.status,
        data.error?.code ?? "UNKNOWN",
        data.error?.message ?? res.statusText
      );
    }

    return data as T;
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body: unknown) => this.request<T>("POST", path, body);
}

export function formatError(e: unknown): string {
  if (e instanceof CallboardError) return `Callboard ${e.status} ${e.code}: ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

/** Build a URLSearchParams from a record, skipping undefined values. */
export function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
