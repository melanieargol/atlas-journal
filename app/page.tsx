import Link from "next/link";
import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "Atlas Journal | Home"
};

export default async function HomePage() {
  return (
    <AppFrame
      title="Raw journaling in. Structured insight out."
      description="Atlas Journal turns free-form journaling into patterns you can actually revisit: emotional movement, recurring triggers, restorative actions, and grounded trend signals over time."
    >
      <section className="panel landing-choice-panel reveal-panel">
        <div className="cta-row landing-choice-row">
          <Link href="/demo/dashboard" className="primary-button">
            Try Demo
          </Link>
          <Link href="/auth/sign-in" className="secondary-button">
            Sign In
          </Link>
        </div>
      </section>
    </AppFrame>
  );
}
