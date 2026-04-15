"use client";

import { useEffect, useState } from "react";
import { api, Agent, getStoredApiKey } from "../../../lib/api";
import { ApiKeyBanner } from "../../../components/ApiKeyBanner";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-[#00b894]/10 text-[#00b894]",
  INACTIVE: "bg-[#6b7280]/10 text-[#6b7280]",
  SUSPENDED: "bg-[#e17055]/10 text-[#e17055]",
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Agents
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            {agents ? `${agents.length} registered` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors"
        >
          + Register Agent
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-xl text-sm text-[#e17055]">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-6 px-4 py-3 bg-[#00b894]/10 border border-[#00b894]/30 rounded-xl">
          <div className="text-sm font-medium text-[#00b894] mb-2">
            Agent registered — save this API key (shown only once):
          </div>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-white rounded-lg font-mono text-xs break-all">
              {newKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
              }}
              className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-xs font-medium hover:bg-[#f8f9fa]"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="px-3 py-2 text-xs text-[#6b7280] hover:text-[#0f0f0f]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 mb-6">
          <h2 className="font-bold mb-4">Register New Agent</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Agent Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20"
                placeholder="e.g. CodeOwl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Endpoint URL</label>
              <input
                value={form.endpointUrl}
                onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20"
                placeholder="https://api.example.com/agent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Capabilities (comma-separated)</label>
              <input
                value={form.capabilities}
                onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20"
                placeholder="code-review, bug-detection"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Price per Task (cents)</label>
              <input
                type="number"
                value={form.pricePerUnit}
                onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20"
                placeholder="250"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 h-20 resize-none"
                placeholder="What does this agent do?"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={submitting || !form.name || !form.endpointUrl || !form.capabilities}
              className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Registering…" : "Register"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm text-[#6b7280] hover:bg-[#f8f9fa] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa]">
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Agent</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Capabilities</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Price</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Reputation</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Tasks</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b7280]">
                  Loading…
                </td>
              </tr>
            ) : displayAgents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b7280]">
                  {getStoredApiKey()
                    ? "No agents yet. Register one above."
                    : "Set your API key above to load real agents, or run `npm run db:seed` first."}
                </td>
              </tr>
            ) : (
              displayAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#f8f9fa]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-[#6b7280] font-mono">{agent.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {agent.capabilities.map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded bg-[#6c5ce7]/10 text-[#6c5ce7]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    ${(agent.pricePerUnit / 100).toFixed(2)}/{agent.pricingModel === "PER_CALL" ? "call" : "task"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
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
                      <span className="text-xs font-medium">{agent.reputationScore.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {agent.totalTasks}{" "}
                    <span className="text-[#6b7280]">({(agent.successRate * 100).toFixed(0)}%)</span>
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
