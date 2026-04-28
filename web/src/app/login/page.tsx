"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.auth.requestMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link href="/" className="flex items-center gap-2 mb-10">
        <img src="/logo.svg" alt="Callboard" className="w-9 h-9" />
        <span
          className="font-bold text-xl tracking-wide text-foreground"
          style={{ fontFamily: "var(--font-dm-serif)" }}
        >
          Callboard
        </span>
      </Link>

      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8">
        <h1
          className="text-2xl text-foreground mb-2"
          style={{ fontFamily: "var(--font-dm-serif)" }}
        >
          Sign in
        </h1>
        <p className="text-sm text-muted mb-6">
          We&apos;ll email you a one-time link. No password required.
        </p>

        {sent ? (
          <div className="px-4 py-3 bg-success/10 border border-success/30 rounded-xl text-sm">
            <div className="font-medium text-success mb-1">Check your inbox</div>
            <p className="text-muted">
              If <span className="font-mono text-foreground">{email}</span> has an account,
              we just sent a sign-in link. It expires in 15 minutes.
            </p>
            <p className="text-xs text-muted mt-3">
              Running locally? The link is logged to your backend terminal.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Email
              </span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm border border-border bg-surface-alt text-foreground placeholder:text-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </label>

            {error && (
              <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full px-4 py-2.5 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-border text-xs text-muted">
          Prefer pasting an API key?{" "}
          <Link href="/dashboard" className="text-accent hover:text-accent-light">
            Continue to the dashboard
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
