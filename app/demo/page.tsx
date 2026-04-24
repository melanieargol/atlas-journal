import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { DemoSandboxSurface } from "@/components/DemoSandboxSurface";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Atlas Journal | Guest Demo"
};

export default async function DemoPage() {
  const user = await getCurrentUser();

  return (
    <AppFrame
      title="Try Atlas Journal in a temporary sandbox."
      description="Write a real entry, watch Atlas build a reflection in real time, and leave whenever you want. Nothing from this sandbox is saved."
      demoMode
      demoNote="temporary sandbox + sample explorer"
    >
      <DemoSandboxSurface
        accountHref={user ? "/journal" : "/auth/sign-in"}
        accountLabel={user ? "Save a real entry" : "Save future entries"}
      />
    </AppFrame>
  );
}
