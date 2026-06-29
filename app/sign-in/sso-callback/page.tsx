"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignInSSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      continueSignUpUrl="/waitlist?auth=invite-only&from=sign-in"
      signUpForceRedirectUrl="/waitlist?auth=invite-only&from=sign-in"
      signInForceRedirectUrl="/dashboard"
    />
  );
}
