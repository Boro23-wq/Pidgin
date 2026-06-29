"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { isInviteOnlyEnabled } from "@/lib/invite-only";

export default function SignInSSOCallback() {
  const inviteOnly = isInviteOnlyEnabled();

  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      continueSignUpUrl={inviteOnly ? "/waitlist?auth=invite-only&from=sign-in" : "/sign-up"}
      signUpForceRedirectUrl={inviteOnly ? "/waitlist?auth=invite-only&from=sign-in" : "/dashboard"}
      signInForceRedirectUrl="/dashboard"
    />
  );
}
