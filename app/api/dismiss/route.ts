import { auth } from "@clerk/nextjs/server";
import { dismissEmails } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { emailIds } = await req.json();
  if (!Array.isArray(emailIds)) return Response.json({ error: "Bad request" }, { status: 400 });

  await dismissEmails(emailIds, userId);
  return Response.json({ ok: true });
}
