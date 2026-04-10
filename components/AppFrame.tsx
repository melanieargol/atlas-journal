import Link from "next/link";
import type { ReactNode } from "react";

type AppFrameProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AppFrame({ title, description, children }: AppFrameProps) {
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
          <Link href="/journal">Journal</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/archive">Archive</Link>
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
    </div>
  );
}
