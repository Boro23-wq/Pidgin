import { auth } from "@clerk/nextjs/server";
import { dismissEmails, getDismissedEmails, undismissEmail } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Support both old format { emailIds: string[] } and new format { emails: [{id, fromName, ...}] }
  let emails: Array<{ id: string; fromName?: string; fromEmail?: string; subject?: string }>;
  if (Array.isArray(body.emails)) {
    emails = body.emails;
  } else if (Array.isArray(body.emailIds)) {
    emails = body.emailIds.map((id: string) => ({ id }));
  } else {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  await dismissEmails(emails, userId);
  return Response.json({ ok: true });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const emails = await getDismissedEmails(userId);
  return Response.json({ emails });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const emailId = searchParams.get("emailId");
  if (!emailId) return Response.json({ error: "Missing emailId" }, { status: 400 });

  await undismissEmail(emailId, userId);
  return Response.json({ ok: true });
}
