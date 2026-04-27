"use client";

import { useEffect, useState } from "react";
import { api, ApiKeyInfo, getStoredApiKey } from "../../../lib/api";
import { ApiKeyBanner } from "../../../components/ApiKeyBanner";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read", "write"]);
  const [submitting, setSubmitting] = useState(false);

  const loadKeys = async () => {
    if (!getStoredApiKey()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.apiKeys.list();
      setKeys(result.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.apiKeys.create({ label: label || undefined, scopes });
      setNewKeyVisible(result.key);
      setLabel("");
      setShowNew(false);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? It will stop working immediately.")) return;
    try {
      await api.apiKeys.revoke(id);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const displayKeys = keys ?? [];
  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "-");

  return (
    <div>
      <ApiKeyBanner />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-dm-serif)" }}>
            API Keys
          </h1>
          <p className="text-sm text-muted mt-1">Manage authentication keys for your agents</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors"
        >
          + Create Key
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger">
          {error}
        </div>
      )}

      {newKeyVisible && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-success font-bold text-sm">New API Key Created</span>
          </div>
          <p className="text-xs text-muted mb-3">
            Copy this key now. You won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-surface-dark px-4 py-2.5 rounded-lg border border-border font-mono text-xs text-foreground break-all">
              {newKeyVisible}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newKeyVisible)}
              className="px-4 py-2.5 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-surface-alt transition-colors whitespace-nowrap"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKeyVisible(null)}
              className="px-4 py-2.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <h2 className="font-bold mb-4 text-foreground">Create API Key</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="e.g. Production key"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Scopes</label>
              <div className="flex gap-2">
                {["read", "write"].map((s) => (
                  <label key={s} className="flex items-center gap-1 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={scopes.includes(s)}
                      onChange={() => toggleScope(s)}
                      className="accent-accent"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={submitting || scopes.length === 0}
              className="px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Key"}
            </button>
            <button
              onClick={() => setShowNew(false)}
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
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Key</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Label</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Scopes</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Created</th>
              <th className="text-left px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3 font-medium text-muted text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">
                  Loading…
                </td>
              </tr>
            ) : displayKeys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">
                  {getStoredApiKey()
                    ? "No keys yet. Create one above."
                    : "Set your API key above to view your keys."}
                </td>
              </tr>
            ) : (
              displayKeys.map((key) => (
                <tr
                  key={key.id}
                  className={`hover:bg-surface-alt/60 transition-colors ${key.revoked ? "opacity-50" : ""}`}
                >
                  <td className="px-6 py-3.5 font-mono text-xs text-foreground">{key.keyPrefix}...****</td>
                  <td className="px-6 py-3.5 text-foreground">{key.label || "-"}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex gap-1">
                      {key.scopes.map((s) => (
                        <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-surface-alt text-muted">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-muted">{formatDate(key.createdAt)}</td>
                  <td className="px-6 py-3.5">
                    {key.revoked ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-danger/15 text-danger font-medium">
                        Revoked
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {!key.revoked && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-xs text-danger hover:underline"
                      >
                        Revoke
                      </button>
                    )}
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
