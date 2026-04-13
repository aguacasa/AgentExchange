"use client";

import Link from "next/link";

// Mock data for the overview — in production, fetched from API
const MOCK_STATS = {
  totalAgents: 12,
  activeTasks: 34,
  completedTasks: 847,
  totalEarnings: 124350, // cents
  avgReputation: 87.3,
  successRate: 94.2,
};

const RECENT_TASKS = [
  { id: "t-1", capability: "code-review", seller: "CodeOwl", status: "COMPLETED", price: 250, time: "2m ago" },
  { id: "t-2", capability: "text-summarization", seller: "SumBot", status: "IN_PROGRESS", price: 100, time: "5m ago" },
  { id: "t-3", capability: "translation", seller: "LinguaAgent", status: "SUBMITTED", price: 175, time: "12m ago" },
  { id: "t-4", capability: "data-extraction", seller: "ParsePro", status: "COMPLETED", price: 400, time: "1h ago" },
  { id: "t-5", capability: "image-analysis", seller: "VisionAI", status: "DISPUTED", price: 350, time: "2h ago" },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-[#00b894]/10 text-[#00b894]",
  IN_PROGRESS: "bg-[#0984e3]/10 text-[#0984e3]",
  SUBMITTED: "bg-[#fdcb6e]/10 text-[#d63031]",
  OPEN: "bg-[#6b7280]/10 text-[#6b7280]",
  DISPUTED: "bg-[#e17055]/10 text-[#e17055]",
  FAILED: "bg-[#e17055]/10 text-[#e17055]",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DashboardOverview() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>
          Dashboard
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">Overview of your Callboard activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">My Agents</div>
          <div className="text-3xl font-bold">{MOCK_STATS.totalAgents}</div>
          <div className="text-xs text-[#00b894] mt-1">All active</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Active Tasks</div>
          <div className="text-3xl font-bold">{MOCK_STATS.activeTasks}</div>
          <div className="text-xs text-[#6b7280] mt-1">{MOCK_STATS.completedTasks} completed all time</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Total Earnings</div>
          <div className="text-3xl font-bold">{formatCents(MOCK_STATS.totalEarnings)}</div>
          <div className="text-xs text-[#00b894] mt-1">+$234.50 this week</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Avg Reputation</div>
          <div className="text-3xl font-bold">{MOCK_STATS.avgReputation}</div>
          <div className="text-xs text-[#6b7280] mt-1">Out of 100</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Success Rate</div>
          <div className="text-3xl font-bold">{MOCK_STATS.successRate}%</div>
          <div className="text-xs text-[#00b894] mt-1">Above marketplace avg</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-1">Disputes</div>
          <div className="text-3xl font-bold">2</div>
          <div className="text-xs text-[#e17055] mt-1">1 pending resolution</div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="bg-white rounded-xl border border-[#e5e7eb]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <h2 className="font-bold">Recent Tasks</h2>
          <Link href="/dashboard/tasks" className="text-sm text-[#6c5ce7] hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-[#e5e7eb]">
          {RECENT_TASKS.map((task) => (
            <div key={task.id} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] flex items-center justify-center text-xs font-mono text-[#6b7280]">
                  {task.capability.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{task.capability}</div>
                  <div className="text-xs text-[#6b7280]">{task.seller} &middot; {task.time}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{formatCents(task.price)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ""}`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
