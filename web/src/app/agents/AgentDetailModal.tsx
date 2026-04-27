"use client";

import { useEffect } from "react";
import { Agent, categoryTint, formatCents, formatResponseMs } from "./agents";

interface AgentDetailModalProps {
  agent: Agent | null;
  onClose: () => void;
}

export function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  useEffect(() => {
    if (!agent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [agent, onClose]);

  if (!agent) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center px-4 py-6 md:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-detail-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-[#f8f9fa] hover:text-foreground transition-colors z-10"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              style={categoryTint(agent.category)}
              className="inline-block text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            >
              {agent.category}
            </span>
            {agent.trustBadges.map((b) => (
              <span
                key={b}
                className="inline-block text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00b894]/10 text-[#00b894]"
              >
                {b}
              </span>
            ))}
            <span className="text-xs text-muted ml-auto">by {agent.owner}</span>
          </div>

          <h2
            id="agent-detail-title"
            className="text-3xl md:text-4xl mb-2 leading-tight"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            {agent.name}
          </h2>
          <p className="text-base text-muted mb-6">{agent.tagline}</p>

          <p className="text-sm leading-relaxed text-foreground mb-6">
            {agent.description}
          </p>

          <Section title="Capabilities">
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.map((c) => (
                <span
                  key={c}
                  className="text-xs px-2 py-0.5 rounded bg-[#6c5ce7]/10 text-[#6c5ce7]"
                >
                  {c}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Performance">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Reputation" value={`${agent.reputationScore}/100`} tone={repTone(agent.reputationScore)} />
              <Stat label="Total tasks" value={agent.totalTasks.toLocaleString()} />
              <Stat label="Success rate" value={`${(agent.successRate * 100).toFixed(1)}%`} tone={agent.successRate >= 0.95 ? "good" : agent.successRate >= 0.9 ? "warn" : "bad"} />
              <Stat label="Avg response" value={formatResponseMs(agent.avgResponseMs)} />
              <Stat label="SLA uptime" value={`${agent.slaUptimePct}%`} />
              <Stat label="Dispute rate" value={`${(agent.disputeRate * 100).toFixed(1)}%`} tone={agent.disputeRate <= 0.01 ? "good" : agent.disputeRate <= 0.02 ? "warn" : "bad"} />
            </div>
          </Section>

          <Section title="Pricing">
            <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] flex items-baseline justify-between">
              <div>
                <div
                  className="text-2xl"
                  style={{ fontFamily: "var(--font-dm-serif)" }}
                >
                  {formatCents(agent.pricePerTaskCents)}
                </div>
                <div className="text-xs text-muted mt-0.5">Escrow-protected · pay on verified delivery</div>
              </div>
              <span className="text-xs text-muted">★ {agent.rating.toFixed(1)}</span>
            </div>
          </Section>

          <Section title="Sample input">
            <div className="p-4 rounded-xl bg-[#0d0d12] text-white/80 text-xs font-mono leading-relaxed overflow-x-auto">
              {agent.sampleInput}
            </div>
          </Section>

          <Section title="Sample output">
            <div className="p-4 rounded-xl bg-[#0d0d12] text-white/80 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {agent.sampleOutput}
            </div>
          </Section>

          <button
            type="button"
            onClick={() =>
              alert(`Hiring flow for ${agent.name} will launch after developer preview.`)
            }
            className="w-full mt-2 px-6 py-3 bg-[#6c5ce7] text-white rounded-xl font-medium hover:bg-[#6c5ce7]/90 transition-colors"
          >
            Hire {agent.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

type Tone = "good" | "warn" | "bad" | "neutral";

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneClass =
    tone === "good"
      ? "text-[#00b894]"
      : tone === "warn"
      ? "text-[#b08a2a]"
      : tone === "bad"
      ? "text-[#e17055]"
      : "text-foreground";
  return (
    <div className="p-3 rounded-lg border border-[#e5e7eb] bg-white">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted mb-1">
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function repTone(score: number): Tone {
  if (score >= 90) return "good";
  if (score >= 75) return "warn";
  return "bad";
}
