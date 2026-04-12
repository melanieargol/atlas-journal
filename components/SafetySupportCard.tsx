import type { JournalAnalysis } from "@/types/journal";

type SafetySupportCardProps = {
  assessment: JournalAnalysis["safety_assessment"];
};

export function SafetySupportCard({ assessment }: SafetySupportCardProps) {
  if (assessment.level !== "moderate" && assessment.level !== "high") {
    return null;
  }

  return (
    <section className={`support-banner support-banner-${assessment.level}`}>
      <div className="section-head compact-head">
        <div>
          <p className="section-label">Support</p>
          <h2>Pause here and reach for support now.</h2>
        </div>
        <div className="entry-stats">
          <span>{assessment.level} concern</span>
        </div>
      </div>

      <p className="support-banner-copy">
        This entry sounds especially heavy or concerning. You deserve immediate support from a real person right now.
      </p>

      {assessment.evidence.length > 0 ? (
        <div className="tag-row">
          {assessment.evidence.map((item) => (
            <span key={item} className="tag">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="support-banner-grid">
        <article className="support-resource-card">
          <p className="section-label">U.S. and territories</p>
          <strong>Call or text 988</strong>
          <p className="muted-text">Suicide & Crisis Lifeline</p>
        </article>

        <article className="support-resource-card">
          <p className="section-label">UK and Ireland</p>
          <strong>Call 116 123</strong>
          <p className="muted-text">Samaritans</p>
        </article>
      </div>

      <p className="muted-text support-banner-footnote">
        If you may be in immediate danger, contact local emergency services now. If there is someone you trust nearby, reaching out to them right away can also help.
      </p>
    </section>
  );
}
