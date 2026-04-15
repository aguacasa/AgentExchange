"use client";

import { useEffect, useState } from "react";
import { api, Task, TaskStatus, getStoredApiKey } from "../../../lib/api";
import { STATUS_COLORS, formatCents } from "../../../lib/constants";
import { ApiKeyBanner } from "../../../components/ApiKeyBanner";

const FILTER_OPTIONS: Array<TaskStatus | "ALL"> = [
  "ALL", "OPEN", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "FAILED", "DISPUTED",
];

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskStatus | "ALL">("ALL");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!getStoredApiKey()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = filter !== "ALL" ? { status: filter } : undefined;
        const result = await api.tasks.list(params);
        setTasks(result.tasks);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  const displayTasks = tasks ?? [];

  return (
    <div>
      <ApiKeyBanner />

      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Tasks
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">
          {tasks ? `${tasks.length} task${tasks.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-xl text-sm text-[#e17055]">
          {error}
        </div>
      )}

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

      <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa]">
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">ID</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Capability</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Buyer</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Seller</th>
              <th className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wider">Price</th>
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
            ) : displayTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b7280]">
                  {getStoredApiKey()
                    ? "No tasks matching this filter."
                    : "Set your API key above to load real tasks."}
                </td>
              </tr>
            ) : (
              displayTasks.map((task) => (
                <tr key={task.id} className="hover:bg-[#f8f9fa]/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs text-[#6b7280]">
                    {task.id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#6c5ce7]/10 text-[#6c5ce7]">
                      {task.capabilityRequested}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm">
                    {task.buyerAgent?.name ?? task.buyerAgentId.slice(0, 8) + "…"}
                  </td>
                  <td className="px-6 py-3.5 text-sm">
                    {task.sellerAgent?.name ?? (task.sellerAgentId ? task.sellerAgentId.slice(0, 8) + "…" : "-")}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs">{formatCents(task.price)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ""}`}>
                      {task.status.replace("_", " ")}
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
