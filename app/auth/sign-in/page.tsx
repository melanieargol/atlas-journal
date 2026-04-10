import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { AuthSignInForm } from "@/components/AuthSignInForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Atlas Journal | Sign In"
};

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AppFrame
      title="Private journaling, synced to you"
      description="Sign in with a magic link to keep your entries, archive, and pattern dashboard clearly tied to your own account."
    >
      <AuthSignInForm />
    </AppFrame>
  );
}
