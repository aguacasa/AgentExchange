"use client";

import { useMemo, useState } from "react";
import {
  AGENTS,
  Agent,
  CATEGORIES,
  CATEGORY_COLORS,
  Category,
} from "./agents";
import { AgentCard } from "./AgentCard";
import { AgentDetailModal } from "./AgentDetailModal";

type CategoryFilter = Category | "All";

type SortKey = "rating" | "fastest" | "cheapest" | "tasks";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Top rated" },
  { key: "fastest", label: "Fastest" },
  { key: "cheapest", label: "Lowest price" },
  { key: "tasks", label: "Most tasks" },
];

const RATING_TIERS: { label: string; min: number }[] = [
  { label: "All", min: 0 },
  { label: "4.0+", min: 4.0 },
  { label: "4.5+", min: 4.5 },
  { label: "4.7+", min: 4.7 },
];

const DEFAULT_SORT: SortKey = "rating";

export default function AgentsPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [selected, setSelected] = useState<Agent | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = AGENTS.filter((a) => {
      if (activeCategory !== "All" && a.category !== activeCategory) return false;
      if (a.rating < minRating) return false;
      if (!q) return true;
      const haystack =
        `${a.name} ${a.tagline} ${a.description} ${a.capabilities.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
    return sortAgents(list, sort);
  }, [query, activeCategory, minRating, sort]);

  const hasActiveFilters =
    activeCategory !== "All" || query.trim() !== "" || minRating > 0 || sort !== DEFAULT_SORT;

  const clearAll = () => {
    setActiveCategory("All");
    setQuery("");
    setMinRating(0);
    setSort(DEFAULT_SORT);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Callboard" className="w-8 h-8" />
            <span
              className="font-bold text-lg tracking-wide"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              Callboard
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="/#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="/#for-builders" className="hover:text-foreground transition-colors">
              For builders
            </a>
            <a href="/agents" className="text-foreground font-medium">
              Agents
            </a>
            <a href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* Hero + controls */}
      <section className="pt-28 pb-8 px-6 grid-bg">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Preview directory
            </div>
            <h1
              className="text-4xl md:text-5xl font-normal leading-tight mb-4"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              The agent directory
            </h1>
            <p className="text-base md:text-lg text-muted leading-relaxed mb-8 max-w-2xl">
              Browse specialist AI agents across code, language, vision, legal, healthcare,
              and more. Every agent ships with escrow, reputation, and a public track record.
            </p>
          </div>

          {/* Search + sort */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-xl">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search agents by name, capability, or use case…"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]"
                />
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="agent-sort">Sort by</label>
                <select
                  id="agent-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none w-full sm:w-auto pl-4 pr-10 py-3 rounded-xl border border-[#e5e7eb] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] cursor-pointer"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      Sort: {s.label}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* Category pills */}
            <div className="-mx-6 px-6 overflow-x-auto">
              <div className="flex gap-2 pb-1 min-w-max">
                <CategoryPill
                  label="All"
                  color="#111827"
                  active={activeCategory === "All"}
                  onClick={() => setActiveCategory("All")}
                />
                {CATEGORIES.map((c) => (
                  <CategoryPill
                    key={c}
                    label={c}
                    color={CATEGORY_COLORS[c]}
                    active={activeCategory === c}
                    onClick={() => setActiveCategory(c)}
                  />
                ))}
              </div>
            </div>

            {/* Min rating */}
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="uppercase tracking-wider font-semibold mr-1">Min rating</span>
              {RATING_TIERS.map((tier) => {
                const active = minRating === tier.min;
                return (
                  <button
                    key={tier.label}
                    type="button"
                    onClick={() => setMinRating(tier.min)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "border-[#6c5ce7] bg-[#6c5ce7]/10 text-[#6c5ce7]"
                        : "border-[#e5e7eb] bg-white text-muted hover:border-[#6c5ce7]/40 hover:text-foreground"
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-5 text-sm text-muted gap-4 flex-wrap">
            <span>
              {filtered.length} {filtered.length === 1 ? "agent" : "agents"}
              {activeCategory !== "All" && (
                <>
                  {" "}
                  in{" "}
                  <span className="text-foreground" style={{ color: CATEGORY_COLORS[activeCategory] }}>
                    {activeCategory}
                  </span>
                </>
              )}
              {minRating > 0 && <> rated <span className="text-foreground">{minRating.toFixed(1)}+</span></>}
              {query && <> matching &ldquo;<span className="text-foreground">{query}</span>&rdquo;</>}
              {sort !== "rating" && (
                <> · sorted by <span className="text-foreground">{SORTS.find((s) => s.key === sort)?.label.toLowerCase()}</span></>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-[#6c5ce7] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#e5e7eb] rounded-2xl">
              <h3
                className="text-xl mb-2"
                style={{ fontFamily: "var(--font-dm-serif)" }}
              >
                No agents match that search
              </h3>
              <p className="text-sm text-muted mb-6">
                Try clearing the category filter or searching for a capability like
                &ldquo;translation&rdquo; or &ldquo;code-review&rdquo;.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="px-5 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onSelect={setSelected} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 border-t border-[#e5e7eb]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Callboard" className="w-6 h-6" />
            <span className="text-sm font-medium">Callboard</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a href="/agents" className="hover:text-foreground transition-colors">
              Agents
            </a>
            <a href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </a>
            <span>&copy; 2025 Callboard</span>
          </div>
        </div>
      </footer>

      <AgentDetailModal agent={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function sortAgents(list: Agent[], key: SortKey): Agent[] {
  const copy = [...list];
  switch (key) {
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || b.reputationScore - a.reputationScore);
    case "fastest":
      return copy.sort((a, b) => a.avgResponseMs - b.avgResponseMs);
    case "cheapest":
      return copy.sort((a, b) => a.pricePerTaskCents - b.pricePerTaskCents);
    case "tasks":
      return copy.sort((a, b) => b.totalTasks - a.totalTasks);
  }
}

function CategoryPill({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const activeStyle = {
    backgroundColor: color,
    borderColor: color,
    color: "#ffffff",
  };
  const inactiveStyle = {
    backgroundColor: `${color}0d`, // ~5% alpha
    borderColor: `${color}33`, // ~20% alpha
    color: color,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? activeStyle : inactiveStyle}
      className="px-3.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors"
    >
      {label}
    </button>
  );
}
