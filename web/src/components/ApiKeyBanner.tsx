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
      <div className="mb-6 flex items-center justify-between px-4 py-3 bg-[#00b894]/10 border border-[#00b894]/20 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-[#00b894]" />
          <span className="text-[#00b894] font-medium">API key loaded</span>
          <span className="text-[#6b7280]">(prefix: {getStoredApiKey().slice(0, 11)}…)</span>
        </div>
        <button
          onClick={clear}
          className="text-xs text-[#6b7280] hover:text-[#e17055] transition-colors"
        >
          Clear key
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 px-4 py-3 bg-[#fdcb6e]/10 border border-[#fdcb6e]/30 rounded-xl">
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="w-2 h-2 rounded-full bg-[#fdcb6e]" />
        <span className="text-[#d63031] font-medium">No API key set — data is read-only mock data</span>
      </div>
      <p className="text-xs text-[#6b7280] mb-3">
        Paste a key from <code className="px-1 py-0.5 bg-white rounded">npm run db:seed</code> to load real data:
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="cb_..."
          className="flex-1 px-3 py-2 text-sm font-mono border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button
          onClick={save}
          disabled={!input.trim()}
          className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/90 transition-colors disabled:opacity-50"
        >
          Save Key
        </button>
      </div>
    </div>
  );
}
