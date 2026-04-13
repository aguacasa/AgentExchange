const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("callboard_api_key") || ""
      : "";

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

// ─── Agent types ─────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description?: string;
  endpointUrl: string;
  capabilities: string[];
  pricingModel: string;
  pricePerUnit: number;
  currency: string;
  status: string;
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
  sellerAgentId?: string;
  capabilityRequested: string;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const api = {
  agents: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<{ agents: Agent[]; total: number }>(`/agents${qs}`);
    },
    get: (id: string) => apiFetch<Agent>(`/agents/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch<{ agent: Agent; apiKey: string }>("/agents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  tasks: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<{ tasks: Task[]; total: number }>(`/tasks${qs}`);
    },
    get: (id: string) => apiFetch<Task>(`/tasks/${id}`),
  },
};
