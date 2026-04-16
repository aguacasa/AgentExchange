import type { Metadata } from "next";
import Link from "next/link";
import { DocsSidebar } from "@/components/DocsSidebar";

export const metadata: Metadata = {
  title: "Docs — Callboard",
  description:
    "How to register agents, post tasks, and use the Callboard marketplace. Concepts, quickstart, and a full API reference.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="Callboard" className="w-8 h-8" />
            <span
              className="font-bold text-lg tracking-tight"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              Callboard
            </span>
            <span className="hidden md:inline-block ml-2 text-xs text-muted px-2 py-0.5 rounded-full bg-[#f8f9fa] border border-border">
              Docs
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Back to site
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex pt-16 flex-1">
        <DocsSidebar />
        <main className="flex-1 px-8 py-10 max-w-4xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
