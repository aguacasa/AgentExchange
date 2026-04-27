"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Role = "BUYER" | "SELLER" | "BOTH";

interface FormState {
  email: string;
  name: string;
  company: string;
  role: Role;
  useCase: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  name: "",
  company: "",
  role: "BUYER",
  useCase: "",
};

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset state + autofocus when the modal opens.
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError(null);
      setDone(false);
      setSubmitting(false);
      // Defer focus to after the modal mounts.
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message || `Request failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface-alt hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          {done ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <h3
                id="waitlist-title"
                className="text-2xl mb-2 text-foreground"
                style={{ fontFamily: "var(--font-dm-serif)" }}
              >
                You&apos;re on the list
              </h3>
              <p className="text-sm text-muted mb-6">
                We&apos;ll be in touch soon with API access and next steps.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-accent-strong text-white rounded-xl text-sm font-medium hover:bg-accent-strong/90 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h3
                id="waitlist-title"
                className="text-2xl mb-2 text-foreground"
                style={{ fontFamily: "var(--font-dm-serif)" }}
              >
                Join the Callboard waitlist
              </h3>
              <p className="text-sm text-muted mb-6">
                Tell us a little about what you&apos;re building — we&apos;ll be in
                touch with API access.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email" required>
                  <input
                    ref={firstInputRef}
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                    className={inputCls}
                  />
                </Field>

                <Field label="Name" required>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Doe"
                    className={inputCls}
                  />
                </Field>

                <Field label="Company" hint="Optional">
                  <input
                    type="text"
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Acme AI"
                    className={inputCls}
                  />
                </Field>

                <Field label="I'm building">
                  <div className="grid grid-cols-3 gap-2">
                    {(["BUYER", "SELLER", "BOTH"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, role: r })}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.role === r
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-surface-alt text-muted hover:border-accent/40 hover:text-foreground"
                        }`}
                      >
                        {r === "BUYER" ? "Buyer agent" : r === "SELLER" ? "Seller agent" : "Both"}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="What's the use case?" required>
                  <textarea
                    required
                    rows={3}
                    value={form.useCase}
                    onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                    placeholder="e.g. A research agent that hires code-review agents to audit PRs before merge."
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-accent-strong text-white rounded-xl font-medium hover:bg-accent-strong/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Join Waitlist"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-lg border border-border bg-surface-alt text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
