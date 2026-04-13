"use client";

import { useState } from "react";

interface KeyRow {
  id: string;
  prefix: string;
  label: string;
  agent?: string;
  scopes: string[];
  lastUsed: string;
  created: string;
  revoked: boolean;
}

const MOCK_KEYS: KeyRow[] = [
  { id: "k-1", prefix: "cb_a3f8e2", label: "Production key", agent: "CodeOwl", scopes: ["read", "write"], lastUsed: "2 hours ago", created: "Mar 15, 2025", revoked: false },
  { id: "k-2", prefix: "cb_7b1d4c", label: "Testing key", scopes: ["read"], lastUsed: "5 days ago", created: "Mar 20, 2025", revoked: false },
  { id: "k-3", prefix: "cb_e9c2a1", label: "SumBot production", agent: "SumBot", scopes: ["read", "write"], lastUsed: "1 hour ago", created: "Feb 28, 2025", revoked: false },
  { id: "k-4", prefix: "cb_1f5b8d", label: "Old staging key", scopes: ["read"], lastUsed: "2 months ago", created: "Jan 10, 2025", revoked: true },
];

export default function ApiKeysPage() {
  const [keys] = useState(MOCK_KEYS);
  const [showNew, setShowNew] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);

  const handleCreate = () => {
    setNewKeyVisible("cb_" + Math.random().toString(36).slice(2, 34) + Math.random().toString(36).slice(2, 34));
    setShowNew(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
            API Keys
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">Manage authentication keys for your agents</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors"
        >
          + Create Key
        </button>
      </div>

      {/* New key reveal */}
      {newKeyVisible && (
        <div className="bg-[#00b894]/10 border border-[#00b894]/20 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#00b894] font-bold text-sm">New API Key Created</span>
          </div>
          <p className="text-xs text-[#6b7280] mb-3">
            Copy this key now. You won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-white px-4 py-2.5 rounded-lg border border-[#e5e7eb] font-mono text-xs break-all">
              {newKeyVisible}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKeyVisible); }}
              className="px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-lg text-xs font-medium hover:bg-[#f8f9fa] transition-colors whitespace-nowrap"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKeyVisible(null)}
              className="px-4 py-2.5 text-xs text-[#6b7280] hover:text-[#0f0f0f] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 mb-6">
          <h2 className="font-bold mb-4">Create API Key</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Label</label>
              <input className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. Production key" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Linked Agent (optional)</label>
              <select className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 bg-white">
                <option value="">None (owner-level)</option>
                <option value="a-1">CodeOwl</option>
                <option value="a-2">SumBot</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors">
              Create Key
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm text-[#6b7280] hover:bg-[#f8f9fa] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa]">
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Key</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Label</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Agent</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Scopes</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Last Used</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {keys.map((key) => (
              <tr key={key.id} className={`hover:bg-[#f8f9fa]/50 transition-colors ${key.revoked ? "opacity-50" : ""}`}>
                <td className="px-6 py-3.5 font-mono text-xs">{key.prefix}...****</td>
                <td className="px-6 py-3.5">{key.label}</td>
                <td className="px-6 py-3.5 text-[#6b7280]">{key.agent || "-"}</td>
                <td className="px-6 py-3.5">
                  <div className="flex gap-1">
                    {key.scopes.map((s) => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-[#f8f9fa] text-[#6b7280]">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-3.5 text-xs text-[#6b7280]">{key.lastUsed}</td>
                <td className="px-6 py-3.5">
                  {key.revoked ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#e17055]/10 text-[#e17055] font-medium">Revoked</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#00b894]/10 text-[#00b894] font-medium">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
