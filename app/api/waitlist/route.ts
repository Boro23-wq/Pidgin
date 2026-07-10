import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { isRateLimited } from "@/lib/rate-limit";

// Deliberately permissive — this is a spam/typo guard, not an attempt to
// validate deliverability. Anything shaped like an address gets through and
// bounces later if it's wrong.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical maximum

// Behind Vercel, x-forwarded-for is client-controlled but the leftmost entry
// is what the edge saw. Good enough to slow down a naive script; not a
// defense against a distributed one.
function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function getClerkErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: String(error), codes: [] as string[] };
  }

  const maybeErrors = (error as { errors?: unknown }).errors;
  if (Array.isArray(maybeErrors)) {
    const details = maybeErrors
      .map((item) => {
        if (typeof item !== "object" || item === null) return null;
        const code = (item as { code?: unknown }).code;
        const message = (item as { message?: unknown }).message;
        return {
          code: typeof code === "string" ? code : "",
          message: typeof message === "string" ? message : "",
        };
      })
      .filter((item): item is { code: string; message: string } => Boolean(item));

    if (details.length) {
      return {
        message: details.map((item) => item.message).filter(Boolean).join(" "),
        codes: details.map((item) => item.code).filter(Boolean),
      };
    }
  }

  const message = (error as { message?: unknown }).message;
  return {
    message: typeof message === "string" ? message : "Could not add email to Clerk waitlist.",
    codes: [] as string[],
  };
}

function isDuplicateClerkWaitlistError(error: unknown) {
  const { message, codes } = getClerkErrorDetails(error);
  const normalizedMessage = message.toLowerCase();
  return (
    codes.some((code) => /already|exists|duplicate/.test(code.toLowerCase())) ||
    /already|exists|duplicate/.test(normalizedMessage)
  );
}

async function addToClerkWaitlist(emailAddress: string) {
  try {
    const client = await clerkClient();
    await client.waitlistEntries.create({ emailAddress });
    return null;
  } catch (error) {
    if (isDuplicateClerkWaitlistError(error)) return null;
    console.error("[waitlist] Clerk waitlist create error:", error);
    return getClerkErrorDetails(error).message;
  }
}

export async function POST(req: Request) {
  // Unauthenticated and public: every call writes to Supabase *and* creates a
  // Clerk waitlist entry, so it's the one route an anonymous caller can use to
  // run up someone else's bill.
  if (isRateLimited(`waitlist:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many signups from this address. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, role, newsletterCount, useCases, accessType } = (body ?? {}) as {
    email?: unknown;
    role?: unknown;
    newsletterCount?: unknown;
    useCases?: unknown;
    accessType?: unknown;
  };

  // Typed check, not just truthiness: a JSON number here used to reach
  // .toLowerCase() and throw a 500.
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  // The survey fields are free-form and only ever read by the admin page, but
  // they still shouldn't be able to write arbitrary JSON shapes into columns.
  const optionalText = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
  const optionalTextArray = (value: unknown): string[] | null =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string").slice(0, 20)
      : null;

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("waitlist")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    const clerkError = await addToClerkWaitlist(normalizedEmail);
    if (clerkError) {
      return NextResponse.json({ error: clerkError, clerkSynced: false }, { status: 502 });
    }
    return NextResponse.json({ existing: true, clerkSynced: true });
  }

  // Save to Supabase
  const { error: dbError } = await supabase.from("waitlist").insert({
    email: normalizedEmail,
    role: optionalText(role),
    newsletter_count: optionalText(newsletterCount),
    use_cases: optionalTextArray(useCases),
    access_type: optionalText(accessType),
  });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const clerkError = await addToClerkWaitlist(normalizedEmail);
  if (clerkError) {
    return NextResponse.json({ error: clerkError, clerkSynced: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true, clerkSynced: true });
}
