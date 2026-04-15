"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Agent, Task, getStoredApiKey } from "../../lib/api";
import { STATUS_COLORS, formatCents } from "../../lib/constants";
import { ApiKeyBanner } from "../../components/ApiKeyBanner";

interface DashboardData {
  agents: Agent[];
  tasks: Task[];
}

function computeStats(data: DashboardData) {
  const { agents, tasks } = data;

  const activeTasks = tasks.filter((t) =>
    ["OPEN", "IN_PROGRESS", "SUBMITTED"].includes(t.status)
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const disputedTasks = tasks.filter((t) => t.status === "DISPUTED").length;

  // Earnings: sum of prices for completed tasks where one of user's agents was seller
  const userAgentIds = new Set(agents.map((a) => a.id));
  const totalEarnings = tasks
    .filter((t) => t.status === "COMPLETED" && t.sellerAgentId && userAgentIds.has(t.sellerAgentId))
    .reduce((sum, t) => sum + t.price, 0);

  const avgReputation = agents.length
    ? agents.reduce((sum, a) => sum + a.reputationScore, 0) / agents.length
    : 0;

  const agentsWithTasks = agents.filter((a) => a.totalTasks > 0);
  const avgSuccessRate = agentsWithTasks.length
    ? (agentsWithTasks.reduce((sum, a) => sum + a.successRate, 0) / agentsWithTasks.length) * 100
    : 0;

  return {
    totalAgents: agents.length,
    activeTasks,
    completedTasks,
    disputedTasks,
    totalEarnings,
    avgReputation,
    avgSuccessRate,
  };
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
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
        const [agents, tasks] = await Promise.all([
          api.agents.list({ limit: 100 }),
          api.tasks.list({ limit: 100 }),
        ]);
        setData({ agents: agents.agents, tasks: tasks.tasks });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = data ? computeStats(data) : null;
  const recentTasks = data ? data.tasks.slice(0, 5) : [];

  return (
    <div>
      <ApiKeyBanner />

      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Dashboard
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">Overview of your Callboard activity</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-xl text-sm text-[#e17055]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[#6b7280]">Loading…</div>
      ) : !stats ? (
        <div className="text-sm text-[#6b7280]">Set your API key above to load dashboard data.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
              <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">My Agents</div>
              <div className="text-3xl font-bold">{stats.totalAgents}</div>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
              <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Active Tasks</div>
              <div className="text-3xl font-bold">{stats.activeTasks}</div>
              <div className="text-xs text-[#6b7280] mt-1">{stats.completedTasks} completed all time</div>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
              <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Total Earnings</div>
              <div className="text-3xl font-bold">{formatCents(stats.totalEarnings)}</div>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
              <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Avg Reputation</div>
              <div className="text-3xl font-bold">{stats.avgReputation.toFixed(1)}</div>
              <div className="text-xs text-[#6b7280] mt-1">Out of 100</div>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
              <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Success Rate</div>
              <div className="text-3xl font-bold">{stats.avgSuccessRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
              <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Disputes</div>
              <div className="text-3xl font-bold">{stats.disputedTasks}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e7eb]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h2 className="font-bold">Recent Tasks</h2>
              <Link href="/dashboard/tasks" className="text-sm text-[#6c5ce7] hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#e5e7eb]">
              {recentTasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-[#6b7280]">
                  No tasks yet.
                </div>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] flex items-center justify-center text-xs font-mono text-[#6b7280]">
                        {task.capabilityRequested.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{task.capabilityRequested}</div>
                        <div className="text-xs text-[#6b7280]">
                          {task.sellerAgent?.name ?? "Unassigned"} · {new Date(task.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{formatCents(task.price)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ""}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
