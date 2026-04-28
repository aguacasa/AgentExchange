"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, AuthUser, getStoredApiKey } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "session"; user: AuthUser }
  | { kind: "api-key" } // legacy: pasted key into localStorage, no real session
  | { kind: "anon" };

interface AuthGateProps {
  children: (ctx: { user: AuthUser | null; signOut: () => Promise<void> }) => React.ReactNode;
}

/**
 * Resolves auth state on mount. Three accepted modes:
 *   1. Live cookie session (preferred — set by /auth/verify)
 *   2. Pasted API key in localStorage (legacy escape hatch — VIS-79 keeps it
 *      working so existing dashboard users aren't kicked out mid-session)
 *   3. Nothing → redirect to /login
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    api.auth
      .me()
      .then(({ user }) => {
        if (!cancelled) setState({ kind: "session", user });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 401) {
          if (getStoredApiKey()) {
            setState({ kind: "api-key" });
          } else {
            setState({ kind: "anon" });
            router.replace("/login");
          }
          return;
        }
        // Network failures — let the page render so the API key path keeps
        // working offline-ish; the dashboard's own fetches will surface errors.
        setState({ kind: "api-key" });
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch {
      // even if revoke fails server-side we still want to drop client state
    }
    router.replace("/login");
  };

  if (state.kind === "loading" || state.kind === "anon") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {children({ user: state.kind === "session" ? state.user : null, signOut })}
    </>
  );
}
