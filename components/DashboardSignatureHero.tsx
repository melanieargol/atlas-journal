"use client";

import Link from "next/link";

import { AnimatedCount } from "@/components/AnimatedCount";

type DashboardSignatureHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  spotlight: {
    label: string;
    before: string;
    after: string;
    summary: string;
  };
  metrics: Array<{
    label: string;
    value: string;
    count?: number;
    suffix?: string;
    supporting: string;
    tone?: "warm" | "cool" | "uplift";
  }>;
  actions?: Array<{
    href: string;
    label: string;
    kind?: "primary" | "secondary";
  }>;
};

export function DashboardSignatureHero({ eyebrow, title, description, spotlight, metrics, actions }: DashboardSignatureHeroProps) {
  return (
    <>
      <section className="dashboard-hero-grid">
        <article className="panel dashboard-flagship-card reveal-panel">
          <p className="section-label">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted-text dashboard-flagship-copy">{description}</p>

          {actions && actions.length > 0 ? (
            <div className="cta-row dashboard-hero-actions">
              {actions.map((action) => (
                <Link key={action.href} href={action.href} className={action.kind === "primary" ? "primary-button" : "secondary-button"}>
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </article>

        <article className="panel dashboard-spotlight-card reveal-panel">
          <p className="section-label">{spotlight.label}</p>
          <div className="dashboard-shift-mark">
            <span>{spotlight.before}</span>
            <span className="dashboard-shift-arrow">{"->"}</span>
            <span>{spotlight.after}</span>
          </div>
          <p className="muted-text">{spotlight.summary}</p>
        </article>
      </section>

      <section className="dashboard-metric-grid">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={metric.tone ? `panel dashboard-metric-card dashboard-metric-card-${metric.tone} reveal-panel` : "panel dashboard-metric-card reveal-panel"}
          >
            <p className="section-label">{metric.label}</p>
            <strong>{metric.value}</strong>
            {typeof metric.count === "number" ? <span className="muted-text"><AnimatedCount value={metric.count} suffix={metric.suffix ?? ""} /></span> : null}
            <span className="muted-text">{metric.supporting}</span>
          </article>
        ))}
      </section>
    </>
  );
}
