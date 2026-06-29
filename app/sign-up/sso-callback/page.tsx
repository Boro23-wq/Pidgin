"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignUpSSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      continueSignUpUrl="/sign-up"
      verifyEmailAddressUrl="/sign-up"
      signUpForceRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
    />
  );
}
