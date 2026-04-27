"use client";

import { Agent, categoryTint, formatCents, formatResponseMs } from "./agents";

interface AgentCardProps {
  agent: Agent;
  onSelect: (a: Agent) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const visibleCaps = agent.capabilities.slice(0, 3);
  const extraCaps = agent.capabilities.length - visibleCaps.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(agent)}
      className="text-left w-full h-full p-5 rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-strong/10 hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          style={categoryTint(agent.category)}
          className="inline-block text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
        >
          {agent.category}
        </span>
        <Rating value={agent.rating} />
      </div>

      <h3
        className="text-xl leading-tight mb-1 text-foreground"
        style={{ fontFamily: "var(--font-dm-serif)" }}
      >
        {agent.name}
      </h3>
      <p className="text-sm text-muted leading-snug mb-4 line-clamp-2">
        {agent.tagline}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {visibleCaps.map((c) => (
          <span
            key={c}
            className="text-[11px] px-2 py-0.5 rounded bg-accent/15 text-accent"
          >
            {c}
          </span>
        ))}
        {extraCaps > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-surface-alt text-muted">
            +{extraCaps}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
        <span className="font-medium text-foreground">
          {formatCents(agent.pricePerTaskCents)}
        </span>
        <span className="text-muted">~{formatResponseMs(agent.avgResponseMs)}</span>
      </div>
    </button>
  );
}

function Rating({ value }: { value: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const rounded = hasHalf ? full + 0.5 : value - full >= 0.75 ? full + 1 : full;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-foreground">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-3.5 h-3.5 text-[#fdcb6e]"
        aria-hidden="true"
      >
        <path d="M12 2.25l2.955 6.28 6.545.75-4.75 4.62 1.205 6.85L12 17.77l-5.955 2.98 1.205-6.85-4.75-4.62 6.545-.75L12 2.25z" />
      </svg>
      <span className="tabular-nums">{rounded.toFixed(1)}</span>
    </span>
  );
}
