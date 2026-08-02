"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        />
      </svg>
    ),
  },
  // Apple / Facebook intentionally disabled for now — Google only.
];

export default function SignInButtons() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  async function signIn(provider) {
    setError(null);
    setLoading(provider);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
    // On success the browser is redirected to the provider.
  }

  return (
    <div className="w-full space-y-3">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          onClick={() => signIn(p.id)}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-accent/60 hover:bg-base-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === p.id ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-accent" />
          ) : (
            p.icon
          )}
          <span>{p.label}</span>
        </button>
      ))}
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
