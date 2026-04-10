import Link from "next/link";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth";

type AppFrameProps = {
  title: string;
  description: string;
  children: ReactNode;
  demoMode?: boolean;
  demoNote?: string;
};

export async function AppFrame({ title, description, children, demoMode = false, demoNote }: AppFrameProps) {
  const user = await getCurrentUser();
  const userEmail = user?.email ?? null;

  return (
    <div className="app-shell">
      <div className="background-haze haze-left" />
      <div className="background-haze haze-right" />

      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-dot" />
          <span>Atlas Journal</span>
        </Link>

        <nav className="nav">
          {demoMode ? (
            <>
              <Link href="/demo/dashboard">Dashboard</Link>
              <Link href="/demo/archive">Archive</Link>
              {user ? <Link href="/dashboard">My account</Link> : <Link href="/auth/sign-in">Sign in</Link>}
            </>
          ) : user ? (
            <>
              <Link href="/journal">Journal</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/archive">Archive</Link>
              {userEmail ? (
                <div className="session-chip" aria-label={`Signed in as ${userEmail}`}>
                  <span className="session-label">Signed in</span>
                  <strong>{userEmail}</strong>
                </div>
              ) : null}
              <form action="/auth/sign-out" method="post">
                <button className="nav-button" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth/sign-in">Sign in</Link>
          )}
        </nav>
      </header>

      <main className="page">
        <section className="hero">
          <p className="eyebrow">Emotional intelligence lab</p>
          {demoMode ? (
            <div className="demo-pill-row">
              <span className="demo-badge">Demo mode</span>
              {demoNote ? <span className="demo-note" aria-hidden="true">{demoNote}</span> : null}
            </div>
          ) : null}
          <h1>{title}</h1>
          <p className="hero-copy">{description}</p>
        </section>
        {children}
      </main>

      <Link
        href={demoMode ? "/auth/sign-in" : user ? "/journal" : "/auth/sign-in"}
        className="floating-action"
        aria-label={demoMode ? "Sign in for your private account" : "Create a new journal entry"}
      >
        +
      </Link>
    </div>
  );
}
