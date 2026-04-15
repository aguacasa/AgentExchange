import React from "react";

interface CodeBlockProps {
  label?: string;
  language?: string;
  children: string;
}

/**
 * Dark code block matching the landing-page hero snippet.
 * Server component — receives code as a string child.
 */
export function CodeBlock({ label, children }: CodeBlockProps) {
  return (
    <div className="bg-[#0d0d12] rounded-2xl p-5 shadow-xl shadow-accent/5 border border-white/5 my-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        {label ? (
          <span className="ml-3 text-xs text-white/30 font-mono">{label}</span>
        ) : null}
      </div>
      <pre className="text-sm text-white/80 font-mono leading-relaxed overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}
