"use client";

import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

export function AuthSignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo
          }
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        setStatus("Check your email for a sign-in link.");
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : "Unable to start sign-in.");
      }
    });
  }

  return (
    <section className="panel auth-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Sign in</p>
          <h2>Email magic link</h2>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          className="date-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />

        <p className="muted-text field-help">
          We&apos;ll send a secure sign-in link so your journal stays private and accessible.
        </p>

        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? "Sending link..." : "Send magic link"}
        </button>
      </form>

      {status ? <div className="success-box">{status}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
    </section>
  );
}
