"use client";

import { useEffect, useState } from "react";
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from "../lib/api";

export function ApiKeyBanner() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    setHasKey(Boolean(getStoredApiKey()));
  }, []);

  const save = () => {
    if (!input.trim()) return;
    setStoredApiKey(input.trim());
    setInput("");
    setHasKey(true);
    window.location.reload();
  };

  const clear = () => {
    clearStoredApiKey();
    setHasKey(false);
    window.location.reload();
  };

  if (hasKey === null) return null;

  if (hasKey) {
    return (
      <div className="mb-6 flex items-center justify-between px-4 py-3 bg-success/10 border border-success/30 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-success font-medium">API key loaded</span>
          <span className="text-muted">(prefix: {getStoredApiKey().slice(0, 11)}…)</span>
        </div>
        <button
          onClick={clear}
          className="text-xs text-muted hover:text-danger transition-colors"
        >
          Clear key
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 px-4 py-3 bg-warning/10 border border-warning/30 rounded-xl">
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="w-2 h-2 rounded-full bg-warning" />
        <span className="text-warning font-medium">No API key set — data is read-only mock data</span>
      </div>
      <p className="text-xs text-muted mb-3">
        Paste a key from <code className="px-1 py-0.5 bg-surface-alt text-foreground rounded border border-border">npm run db:seed</code> to load real data:
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="cb_..."
          className="flex-1 px-3 py-2 text-sm font-mono border border-border bg-surface text-foreground placeholder:text-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button
          onClick={save}
          disabled={!input.trim()}
          className="px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors disabled:opacity-50"
        >
          Save Key
        </button>
      </div>
    </div>
  );
}
