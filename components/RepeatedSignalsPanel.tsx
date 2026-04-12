import type { RepeatedSignal } from "@/types/journal";

function toneClass(tone: RepeatedSignal["tone"]) {
  if (tone === "stress") return "signal-pill-stress";
  if (tone === "support") return "signal-pill-support";
  if (tone === "restorative") return "signal-pill-restorative";
  return "signal-pill-topic";
}

export function RepeatedSignalsPanel({ signals }: { signals: RepeatedSignal[] }) {
  return (
    <section className="panel repeated-signals-panel reveal-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Repeated personal signals</p>
          <h2>What patterns are recurring.</h2>
        </div>
      </div>

      {signals.length > 0 ? (
        <div className="signal-pill-grid">
          {signals.map((signal) => (
            <article key={`${signal.kind}-${signal.label}`} className={`signal-pill ${toneClass(signal.tone)}`}>
              <span className="section-label">{signal.category}</span>
              <strong>{signal.label}</strong>
              <span className="muted-text">
                {signal.count} {signal.count === 1 ? "entry" : "entries"}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-text">
          Repeated personal signals will appear here once a phrase, topic, support, or stressor starts showing up across multiple entries.
        </p>
      )}
    </section>
  );
}
