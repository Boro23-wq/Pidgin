"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { isInviteOnlyEnabled } from "@/lib/invite-only";

export default function SignInSSOCallback() {
  const [hasInviteTicket, setHasInviteTicket] = useState(false);
  const inviteOnly = isInviteOnlyEnabled() && !hasInviteTicket;

  useEffect(() => {
    // Clerk invite links carry a __clerk_ticket param — don't divert a
    // legitimately invited person to the waitlist mid-SSO-callback.
    setHasInviteTicket(
      new URLSearchParams(window.location.search).has("__clerk_ticket"),
    );
  }, []);

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
