import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revokeUserTokens } from "@/lib/tokens";

// Tables keyed by the Clerk user id. `user_tokens` is handled separately by
// revokeUserTokens, which also tells Google to drop the grant.
const USER_TABLES = [
  "summaries",
  "topic_occurrences",
  "dismissed_emails",
  "blocked_senders",
  "digest_feedback",
  "feedback",
] as const;

// Irreversible: revokes Gmail, erases every row this user owns, then deletes
// the Clerk account. Satisfies the "request deletion of all your data" promise
// in app/privacy/page.tsx without a 72-hour manual round trip, and is the kind
// of self-service control Google expects for a restricted-scope app.
//
// Order is deliberate. Gmail access is revoked first, so a later failure can
// never leave a live grant on an account the user believes is gone. Clerk is
// deleted last, because the Clerk user id is the key every one of these
// queries needs — losing it first would strand the data permanently with no
// way to find it again.
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clerk = await clerkClient();

  // Read the email before the Clerk user is gone — the waitlist table is keyed
  // by email, not by user id, and there'd be no way to find the row afterward.
  let email: string | undefined;
  try {
    const user = await clerk.users.getUser(userId);
    email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  } catch {
    // Already deleted from Clerk; carry on and clear whatever data remains.
  }

  try {
    // Best-effort: a user who never connected Gmail has no row, and a token
    // Google already considers dead still resolves fine.
    await revokeUserTokens(userId);

    for (const table of USER_TABLES) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) {
        console.error(`[account] failed clearing ${table} for ${userId}:`, error);
        // Deliberately not claiming nothing was removed: Gmail is already
        // revoked and earlier tables are already cleared. Partial deletion is
        // the honest description, and retrying is safe (every step is
        // idempotent).
        return Response.json(
          {
            error:
              "Deletion failed partway through. Your Gmail access has been revoked and some data was removed. Please try again.",
          },
          { status: 500 },
        );
      }
    }

    if (email) {
      await supabase.from("waitlist").delete().eq("email", email);
    }

    await clerk.users.deleteUser(userId);

    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[account] delete failed for ${userId}:`, err);
    return Response.json({ error: "Could not delete your account." }, { status: 500 });
  }
}
