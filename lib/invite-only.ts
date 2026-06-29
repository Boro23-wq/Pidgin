export const INVITE_ONLY_MESSAGE =
  "Pidgin is invite-only right now. Join the waitlist and I will send you an invite when a spot opens.";

export function isInviteOnlyEnabled() {
  return process.env.NEXT_PUBLIC_INVITE_ONLY !== "false";
}

export function getInviteOnlyWaitlistUrl(from: "sign-in" | "sign-up") {
  return `/waitlist?auth=invite-only&from=${from}`;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage) return maybeMessage;

    const maybeErrors = (error as { errors?: unknown }).errors;
    if (Array.isArray(maybeErrors)) {
      const messages = maybeErrors
        .map((item) =>
          typeof item === "object" && item !== null
            ? (item as { message?: unknown }).message
            : null,
        )
        .filter((message): message is string => Boolean(message));
      if (messages.length) return messages.join(" ");
    }
  }

  return fallback;
}

export function isInviteOnlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  return [
    "invite",
    "invitation",
    "not invited",
    "waitlist",
    "restricted",
    "not allowed",
    "not authorized",
    "access to this application",
    "couldn't find your account",
    "could not find your account",
    "doesn't exist",
    "does not exist",
    "not found",
  ].some((pattern) => normalized.includes(pattern));
}
