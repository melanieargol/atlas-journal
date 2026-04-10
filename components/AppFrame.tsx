import Link from "next/link";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth";

type AppFrameProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export async function AppFrame({ title, description, children }: AppFrameProps) {
  const user = await getCurrentUser();

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
          {user ? (
            <>
              <Link href="/journal">Journal</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/archive">Archive</Link>
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
          <h1>{title}</h1>
          <p className="hero-copy">{description}</p>
        </section>
        {children}
      </main>

      <Link href={user ? "/journal" : "/auth/sign-in"} className="floating-action" aria-label="Create a new journal entry">
        +
      </Link>
    </div>
  );
}
