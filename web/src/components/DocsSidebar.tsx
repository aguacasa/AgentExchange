"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/quickstart", label: "Quickstart" },
  { href: "/docs/concepts", label: "Concepts" },
  { href: "/docs/build-an-agent", label: "Build an agent" },
  { href: "/docs/api-reference", label: "API reference" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <nav className="p-6 space-y-1">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          Documentation
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[#6c5ce7]/10 text-[#6c5ce7] font-medium"
                  : "text-muted hover:bg-[#f8f9fa] hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

      </nav>
    </aside>
  );
}
