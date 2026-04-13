"use client";

import { useState } from "react";

interface AgentRow {
  id: string;
  name: string;
  capabilities: string[];
  pricingModel: string;
  pricePerUnit: number;
  status: string;
  reputationScore: number;
  totalTasks: number;
  successRate: number;
}

const MOCK_AGENTS: AgentRow[] = [
  { id: "a-1", name: "CodeOwl", capabilities: ["code-review", "bug-detection"], pricingModel: "PER_TASK", pricePerUnit: 250, status: "ACTIVE", reputationScore: 94.2, totalTasks: 312, successRate: 0.97 },
  { id: "a-2", name: "SumBot", capabilities: ["text-summarization"], pricingModel: "PER_CALL", pricePerUnit: 50, status: "ACTIVE", reputationScore: 88.1, totalTasks: 1204, successRate: 0.95 },
  { id: "a-3", name: "LinguaAgent", capabilities: ["translation", "localization"], pricingModel: "PER_TASK", pricePerUnit: 175, status: "ACTIVE", reputationScore: 91.5, totalTasks: 567, successRate: 0.98 },
  { id: "a-4", name: "ParsePro", capabilities: ["data-extraction", "pdf-parsing"], pricingModel: "PER_TASK", pricePerUnit: 400, status: "INACTIVE", reputationScore: 76.8, totalTasks: 89, successRate: 0.88 },
  { id: "a-5", name: "VisionAI", capabilities: ["image-analysis", "ocr"], pricingModel: "PER_CALL", pricePerUnit: 150, status: "ACTIVE", reputationScore: 82.4, totalTasks: 203, successRate: 0.91 },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-[#00b894]/10 text-[#00b894]",
  INACTIVE: "bg-[#6b7280]/10 text-[#6b7280]",
  SUSPENDED: "bg-[#e17055]/10 text-[#e17055]",
};

export default function AgentsPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Agents
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">Manage your registered AI agents</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors"
        >
          + Register Agent
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 mb-6">
          <h2 className="font-bold mb-4">Register New Agent</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Agent Name</label>
              <input className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. CodeOwl" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Endpoint URL</label>
              <input className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="https://api.example.com/agent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Capabilities (comma-separated)</label>
              <input className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="code-review, bug-detection" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Price per Task (cents)</label>
              <input type="number" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="250" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#6b7280] mb-1">Description</label>
              <textarea className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 h-20 resize-none" placeholder="What does this agent do?" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors">
              Register
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm text-[#6b7280] hover:bg-[#f8f9fa] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agent list */}
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
            {MOCK_AGENTS.map((agent) => (
              <tr key={agent.id} className="hover:bg-[#f8f9fa]/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-xs text-[#6b7280] font-mono">{agent.id}</div>
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
                          backgroundColor: agent.reputationScore >= 90 ? "#00b894" : agent.reputationScore >= 70 ? "#fdcb6e" : "#e17055",
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium">{agent.reputationScore}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs">
                  {agent.totalTasks} <span className="text-[#6b7280]">({(agent.successRate * 100).toFixed(0)}%)</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[agent.status] || ""}`}>
                    {agent.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
