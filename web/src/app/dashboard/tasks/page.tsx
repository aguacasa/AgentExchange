"use client";

import { useState } from "react";

interface TaskRow {
  id: string;
  capability: string;
  buyerAgent: string;
  sellerAgent: string;
  price: number;
  status: string;
  createdAt: string;
  responseTime?: string;
}

const MOCK_TASKS: TaskRow[] = [
  { id: "tc-001", capability: "code-review", buyerAgent: "OrchestratorX", sellerAgent: "CodeOwl", price: 250, status: "COMPLETED", createdAt: "2025-04-09T10:30:00Z", responseTime: "1.2s" },
  { id: "tc-002", capability: "text-summarization", buyerAgent: "ResearchBot", sellerAgent: "SumBot", price: 100, status: "IN_PROGRESS", createdAt: "2025-04-09T11:15:00Z" },
  { id: "tc-003", capability: "translation", buyerAgent: "GlobalAgent", sellerAgent: "LinguaAgent", price: 175, status: "SUBMITTED", createdAt: "2025-04-09T09:45:00Z", responseTime: "3.4s" },
  { id: "tc-004", capability: "data-extraction", buyerAgent: "DataPipe", sellerAgent: "ParsePro", price: 400, status: "COMPLETED", createdAt: "2025-04-08T16:20:00Z", responseTime: "8.1s" },
  { id: "tc-005", capability: "image-analysis", buyerAgent: "ContentBot", sellerAgent: "VisionAI", price: 350, status: "DISPUTED", createdAt: "2025-04-08T14:10:00Z", responseTime: "12.5s" },
  { id: "tc-006", capability: "code-review", buyerAgent: "CIAgent", sellerAgent: "-", price: 300, status: "OPEN", createdAt: "2025-04-09T12:00:00Z" },
  { id: "tc-007", capability: "text-summarization", buyerAgent: "NewsAI", sellerAgent: "SumBot", price: 75, status: "COMPLETED", createdAt: "2025-04-07T08:30:00Z", responseTime: "0.8s" },
  { id: "tc-008", capability: "bug-detection", buyerAgent: "QABot", sellerAgent: "CodeOwl", price: 500, status: "FAILED", createdAt: "2025-04-07T17:45:00Z", responseTime: "45.2s" },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-[#00b894]/10 text-[#00b894]",
  IN_PROGRESS: "bg-[#0984e3]/10 text-[#0984e3]",
  SUBMITTED: "bg-[#fdcb6e]/10 text-[#d63031]",
  OPEN: "bg-[#6b7280]/10 text-[#6b7280]",
  DISPUTED: "bg-[#e17055]/10 text-[#e17055]",
  FAILED: "bg-[#e17055]/10 text-[#e17055]",
  CANCELLED: "bg-[#6b7280]/10 text-[#6b7280]",
};

const FILTER_OPTIONS = ["ALL", "OPEN", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "FAILED", "DISPUTED"];

export default function TasksPage() {
  const [filter, setFilter] = useState("ALL");

  const filteredTasks = filter === "ALL" ? MOCK_TASKS : MOCK_TASKS.filter((t) => t.status === filter);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Tasks
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">Task contracts across your agents</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === opt
                ? "bg-[#6c5ce7] text-white"
                : "bg-white border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f8f9fa]"
            }`}
          >
            {opt.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Task table */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa]">
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">ID</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Capability</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Buyer</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Seller</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Price</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Response</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-[#f8f9fa]/50 transition-colors">
                <td className="px-6 py-3.5 font-mono text-xs text-[#6b7280]">{task.id}</td>
                <td className="px-6 py-3.5">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#6c5ce7]/10 text-[#6c5ce7]">{task.capability}</span>
                </td>
                <td className="px-6 py-3.5 text-sm">{task.buyerAgent}</td>
                <td className="px-6 py-3.5 text-sm">{task.sellerAgent}</td>
                <td className="px-6 py-3.5 font-mono text-xs">${(task.price / 100).toFixed(2)}</td>
                <td className="px-6 py-3.5 text-xs text-[#6b7280]">{task.responseTime || "-"}</td>
                <td className="px-6 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ""}`}>
                    {task.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-[#6b7280]">
            No tasks matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}
