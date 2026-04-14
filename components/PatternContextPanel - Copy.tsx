import Link from "next/link";

import type { EntryPatternContext } from "@/types/journal";

function toneClass(tone: EntryPatternContext["items"][number]["tone"]) {
  if (tone === "stress") return "signal-pill-stress";
  if (tone === "support") return "signal-pill-support";
  if (tone === "restorative") return "signal-pill-restorative";
  if (tone === "mixed") return "signal-pill-mixed";
  return "signal-pill-topic";
}

export function PatternContextPanel({
  context,
  basePath
}: {
  context: EntryPatternContext;
  basePath: string;
}) {
  if (context.items.length === 0) {
    return null;
  }

  return (
    <section className="panel repeated-signals-panel reveal-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Pattern context</p>
          <h2>What this entry connects to over time.</h2>
        </div>
      </div>

      <p className="muted-text">
        These patterns come from your other entries. Atlas Journal treats the current entry as the moment itself, and this panel as the broader backdrop across{" "}
        {context.windows.short}, {context.windows.main}, and {context.windows.long}.
      </p>

      <div className="signal-pill-grid">
        {context.items.map((item) => (
          <Link
            key={`${item.kind}-${item.label}`}
            href={`${basePath}?q=${encodeURIComponent(item.label)}` as any}
            className={`signal-pill signal-pill-link ${toneClass(item.tone)}`}
          >
            <span className="section-label">
              {item.tier} {item.kind}
            </span>
            <strong>{item.label}</strong>
            <span className="muted-text">
              {item.counts.d30} in 30 days · {item.counts.d90} in 90 days
            </span>
            <span className="muted-text">{item.relation}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
