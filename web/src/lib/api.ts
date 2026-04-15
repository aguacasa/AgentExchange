const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY_STORAGE = "callboard_api_key";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearStoredApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_KEY_STORAGE);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getStoredApiKey();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type PricingModel = "PER_CALL" | "PER_TASK" | "SUBSCRIPTION" | "CUSTOM";
export type TaskStatus =
  | "OPEN" | "ACCEPTED" | "IN_PROGRESS" | "SUBMITTED"
  | "VERIFYING" | "COMPLETED" | "FAILED" | "DISPUTED"
  | "CANCELLED" | "EXPIRED";

export interface Agent {
  id: string;
  name: string;
  description?: string;
  endpointUrl: string;
  capabilities: string[];
  pricingModel: PricingModel;
  pricePerUnit: number;
  currency: string;
  status: AgentStatus;
  reputationScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  buyerAgentId: string;
  sellerAgentId?: string | null;
  capabilityRequested: string;
  inputSchema?: unknown;
  inputData?: unknown;
  outputData?: unknown;
  price: number;
  currency: string;
  timeoutMs: number;
  status: TaskStatus;
  acceptedAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  disputeReason?: string | null;
  createdAt: string;
  updatedAt: string;
  buyerAgent?: Agent;
  sellerAgent?: Agent;
}

export interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  label: string | null;
  agentId: string | null;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface ReputationSummary {
  agentId: string;
  overallScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  recentEvents: Array<{
    id: string;
    metricType: string;
    score: number;
    createdAt: string;
  }>;
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const api = {
  agents: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? "?" + new URLSearchParams(
            Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
          ).toString()
        : "";
      return apiFetch<{ agents: Agent[]; total: number }>(`/agents${qs}`);
    },
    get: (id: string) => apiFetch<Record<string, unknown>>(`/agents/${id}`),
    getReputation: (id: string) => apiFetch<ReputationSummary>(`/agents/${id}/reputation`),
    create: (data: Partial<Agent> & { ownerId?: string; name: string; endpointUrl: string; capabilities: string[] }) =>
      apiFetch<{ agent: Agent; apiKey: string }>("/agents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Agent>) =>
      apiFetch<Agent>(`/agents/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    match: (criteria: {
      capability: string;
      maxPrice?: number;
      minReputation?: number;
      maxResponseMs?: number;
      limit?: number;
    }) =>
      apiFetch<{ matches: Array<{ agent: Record<string, unknown>; matchScore: number; breakdown: Record<string, number> }>; total: number }>(
        "/agents/match",
        { method: "POST", body: JSON.stringify(criteria) }
      ),
  },
  tasks: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? "?" + new URLSearchParams(
            Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
          ).toString()
        : "";
      return apiFetch<{ tasks: Task[]; total: number }>(`/tasks${qs}`);
    },
    get: (id: string) => apiFetch<Task>(`/tasks/${id}`),
    create: (data: {
      buyerAgentId: string;
      capabilityRequested: string;
      inputSchema: Record<string, unknown>;
      inputData?: Record<string, unknown>;
      outputSchema?: Record<string, unknown>;
      qualityCriteria?: Record<string, unknown>;
      price: number;
      currency?: string;
      timeoutMs?: number;
    }) =>
      apiFetch<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
    accept: (id: string, sellerAgentId: string) =>
      apiFetch<Task>(`/tasks/${id}/accept`, {
        method: "POST",
        body: JSON.stringify({ sellerAgentId }),
      }),
    submit: (id: string, sellerAgentId: string, outputData: Record<string, unknown>) =>
      apiFetch<Task>(`/tasks/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ sellerAgentId, outputData }),
      }),
    verify: (id: string, passed: boolean, verificationResult?: Record<string, unknown>) =>
      apiFetch<Task>(`/tasks/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ passed, verificationResult }),
      }),
    dispute: (id: string, reason: string) =>
      apiFetch<Task>(`/tasks/${id}/dispute`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    resolve: (id: string, resolution: "release_to_seller" | "refund_to_buyer", notes?: string) =>
      apiFetch<Task>(`/tasks/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution, notes }),
      }),
  },
  apiKeys: {
    list: () => apiFetch<{ keys: ApiKeyInfo[] }>("/api-keys"),
    create: (data: { label?: string; agentId?: string; scopes?: string[] }) =>
      apiFetch<{ keyInfo: ApiKeyInfo; key: string }>("/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    revoke: (id: string) =>
      apiFetch<{ key: ApiKeyInfo; message: string }>(`/api-keys/${id}`, {
        method: "DELETE",
      }),
  },
  health: () => apiFetch<{ status: string; service: string; version: string }>("/health"),
};
