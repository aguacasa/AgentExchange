"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setError("Missing token in callback URL");
      return;
    }
    api.auth
      .verify(token)
      .then(() => router.replace("/dashboard"))
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not verify the sign-in link"
        );
      });
  }, [token, router]);

  if (error) {
    return (
      <>
        <h1
          className="text-xl text-foreground mb-2"
          style={{ fontFamily: "var(--font-dm-serif)" }}
        >
          That link didn&apos;t work
        </h1>
        <p className="text-sm text-muted mb-6">{error}</p>
        <Link
          href="/login"
          className="inline-block px-4 py-2.5 bg-accent-strong text-white rounded-lg text-sm font-medium hover:bg-accent-strong/90 transition-colors"
        >
          Request a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <div
        className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-accent border-t-transparent animate-spin"
        aria-label="Verifying"
      />
      <h1
        className="text-xl text-foreground mb-2"
        style={{ fontFamily: "var(--font-dm-serif)" }}
      >
        Signing you in…
      </h1>
      <p className="text-sm text-muted">One moment.</p>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 text-center">
        <Suspense
          fallback={
            <div
              className="w-8 h-8 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin"
              aria-label="Loading"
            />
          }
        >
          <CallbackInner />
        </Suspense>
      </div>
    </div>
  );
}
