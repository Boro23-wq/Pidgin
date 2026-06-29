import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

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
  const { email, role, newsletterCount, useCases, accessType } = await req.json();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

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
    role,
    newsletter_count: newsletterCount,
    use_cases: useCases,
    access_type: accessType,
  });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const clerkError = await addToClerkWaitlist(normalizedEmail);
  if (clerkError) {
    return NextResponse.json({ error: clerkError, clerkSynced: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true, clerkSynced: true });
}
