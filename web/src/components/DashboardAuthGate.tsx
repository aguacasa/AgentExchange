"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cb_demo_auth";
const DEMO_EMAIL = "demo@callboard.dev";
const DEMO_PASSWORD = "callboard2026";

export default function DashboardAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">(
    "checking",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStatus(
      window.localStorage.getItem(STORAGE_KEY) === "1" ? "unlocked" : "locked",
    );
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      email.trim().toLowerCase() === DEMO_EMAIL &&
      password === DEMO_PASSWORD
    ) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      setStatus("unlocked");
      setError(null);
    } else {
      setError("Invalid credentials. Try the demo account shown below.");
    }
  }

  if (status === "checking") {
    return <div className="h-screen bg-background" />;
  }

  if (status === "unlocked") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="absolute top-6 left-6 text-sm text-muted hover:text-foreground transition-colors"
      >
        ← Back to home
      </Link>

      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.svg" alt="Callboard" className="w-10 h-10" />
          <span
            className="font-bold text-2xl tracking-wide text-foreground"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Callboard
          </span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground mb-5">
            Sign in
          </h1>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
