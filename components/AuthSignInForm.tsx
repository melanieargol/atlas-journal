"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AuthSignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const callbackError =
    searchParams.get("error") === "auth_callback_failed"
      ? "That sign-in link could not be completed. Please request a fresh magic link and try again."
      : null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    startTransition(async () => {
      try {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
          setError("Enter an email address to receive your sign-in link.");
          return;
        }

        const supabase = createClient();
        const redirectTo = new URL("/auth/callback", window.location.origin);
        redirectTo.searchParams.set("next", "/dashboard");
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: redirectTo.toString()
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
      {!error && callbackError ? <div className="error-box">{callbackError}</div> : null}
    </section>
  );
}
