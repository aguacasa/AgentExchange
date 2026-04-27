"use client";

import { useEffect, useState } from "react";
import { api, Agent, getStoredApiKey } from "../../../lib/api";
import { ApiKeyBanner } from "../../../components/ApiKeyBanner";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-[#00b894]/15 text-[#00b894]",
  INACTIVE: "bg-[#9ca3af]/15 text-[#9ca3af]",
  SUSPENDED: "bg-[#e17055]/15 text-[#e17055]",
};

interface CreateForm {
  name: string;
  description: string;
  endpointUrl: string;
  capabilities: string;
  pricePerUnit: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  description: "",
  endpointUrl: "",
  capabilities: "",
  pricePerUnit: "250",
};

export default function AgentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.agents.list();
      setAgents(result.agents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.agents.create({
        name: form.name,
        description: form.description || undefined,
        endpointUrl: form.endpointUrl,
        capabilities: form.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
        pricePerUnit: parseInt(form.pricePerUnit, 10) || 0,
      });
      setNewKey(result.apiKey);
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  };

  const displayAgents = agents ?? [];

  return (
    <div>
      <ApiKeyBanner />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Agents
          </h1>
          <p className="text-sm text-muted mt-1">
            {agents ? `${agents.length} registered` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors"
        >
          + Register Agent
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-6 px-4 py-3 bg-success/10 border border-success/30 rounded-xl">
          <div className="text-sm font-medium text-success mb-2">
            Agent registered — save this API key (shown only once):
          </div>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-surface-dark text-foreground rounded-lg font-mono text-xs break-all border border-border">
              {newKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
              }}
              className="px-3 py-2 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-surface-alt"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="px-3 py-2 text-xs text-muted hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <h2 className="font-bold mb-4 text-foreground">Register New Agent</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Agent Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="e.g. CodeOwl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Endpoint URL</label>
              <input
                value={form.endpointUrl}
                onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="https://api.example.com/agent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Capabilities (comma-separated)</label>
              <input
                value={form.capabilities}
                onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="code-review, bug-detection"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Price per Task (cents)</label>
              <input
                type="number"
                value={form.pricePerUnit}
                onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="250"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent h-20 resize-none"
                placeholder="What does this agent do?"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={submitting || !form.name || !form.endpointUrl || !form.capabilities}
              className="px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Registering…" : "Register"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-border text-muted rounded-lg text-sm hover:bg-surface-alt hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt">
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Agent</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Capabilities</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Price</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Reputation</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tasks</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">
                  Loading…
                </td>
              </tr>
            ) : displayAgents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">
                  {getStoredApiKey()
                    ? "No agents yet. Register one above."
                    : "Set your API key above to load real agents, or run `npm run db:seed` first."}
                </td>
              </tr>
            ) : (
              displayAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-surface-alt/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{agent.name}</div>
                    <div className="text-xs text-muted font-mono">{agent.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {agent.capabilities.map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-foreground">
                    ${(agent.pricePerUnit / 100).toFixed(2)}/{agent.pricingModel === "PER_CALL" ? "call" : "task"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${agent.reputationScore}%`,
                            backgroundColor:
                              agent.reputationScore >= 90
                                ? "#00b894"
                                : agent.reputationScore >= 70
                                ? "#fdcb6e"
                                : "#e17055",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{agent.reputationScore.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-foreground">
                    {agent.totalTasks}{" "}
                    <span className="text-muted">({(agent.successRate * 100).toFixed(0)}%)</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[agent.status] || ""}`}>
                      {agent.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
