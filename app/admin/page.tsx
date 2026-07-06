import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Single-founder internal viewer — read-only, no admin actions. Gated by an
// explicit email allow-list (ADMIN_EMAILS) on top of Clerk auth, since this
// surfaces other users' feedback and cohort data. Fails closed: if the env
// var isn't set, nobody gets in, including the founder.
function isAdmin(email: string | null | undefined): boolean {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

async function resolveEmails(userIds: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  if (unique.length === 0) return {};
  try {
    const clerk = await clerkClient();
    const { data } = await clerk.users.getUserList({ userId: unique, limit: unique.length });
    const map: Record<string, string> = {};
    for (const u of data) {
      map[u.id] = u.emailAddresses[0]?.emailAddress ?? u.id;
    }
    return map;
  } catch {
    return {};
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">{title}</h2>
      {children}
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground/60 py-6 text-center">{children}</p>;
}

export default async function AdminPage() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  if (!isAdmin(email)) {
    redirect("/dashboard");
  }

  const [
    { count: waitlistCount },
    { count: connectedCount },
    { count: digestEnabledCount },
    { data: waitlistRows },
    { data: digestFeedback },
    { data: flaggedFeedback },
    { data: connectedUsers },
  ] = await Promise.all([
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("user_tokens").select("*", { count: "exact", head: true }),
    supabase.from("user_tokens").select("*", { count: "exact", head: true }).eq("auto_digest_enabled", true),
    supabase
      .from("waitlist")
      .select("email, role, newsletter_count, use_cases, access_type, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("digest_feedback").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("user_tokens").select("clerk_user_id, gmail_address, auto_digest_enabled"),
  ]);

  const flaggedSummaryIds = (flaggedFeedback ?? []).map((f) => f.summary_id).filter(Boolean);
  const { data: flaggedSummaries } = flaggedSummaryIds.length
    ? await supabase.from("summaries").select("id, newsletter_title").in("id", flaggedSummaryIds)
    : { data: [] as { id: string; newsletter_title: string }[] };
  const summaryTitleMap = Object.fromEntries((flaggedSummaries ?? []).map((s) => [s.id, s.newsletter_title]));

  const emailMap = await resolveEmails([
    ...(digestFeedback ?? []).map((f) => f.user_id),
    ...(flaggedFeedback ?? []).map((f) => f.user_id),
    ...(connectedUsers ?? []).map((u) => u.clerk_user_id),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alpha cockpit</h1>
            <p className="text-sm text-muted-foreground mt-1">Internal, read-only. Not linked from anywhere in the app.</p>
          </div>
          <a href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to dashboard →
          </a>
        </div>

        <Section title="Cohort">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Waitlist signups" value={waitlistCount ?? 0} />
            <StatTile label="Connected Gmail" value={connectedCount ?? 0} />
            <StatTile label="Digest enabled" value={digestEnabledCount ?? 0} />
          </div>
        </Section>

        <Section title="Connected users">
          {connectedUsers && connectedUsers.length > 0 ? (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {connectedUsers.map((u) => (
                <div key={u.clerk_user_id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{emailMap[u.clerk_user_id] ?? u.clerk_user_id}</p>
                    <p className="text-xs text-muted-foreground/60">{u.gmail_address}</p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      u.auto_digest_enabled
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {u.auto_digest_enabled ? "Digest on" : "Digest off"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRow>No one has connected Gmail yet.</EmptyRow>
          )}
        </Section>

        <Section title="Digest feedback (thumbs up/down)">
          {digestFeedback && digestFeedback.length > 0 ? (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {digestFeedback.map((f) => (
                <div key={f.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{emailMap[f.user_id] ?? f.user_id}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          f.rating === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {f.rating === "up" ? "Loved it" : "Needs work"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">{formatDate(f.created_at)}</span>
                    </div>
                  </div>
                  {f.message && <p className="text-muted-foreground/80 mt-1.5">{f.message}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyRow>No digest feedback yet.</EmptyRow>
          )}
        </Section>

        <Section title="Flagged inaccurate stories">
          {flaggedFeedback && flaggedFeedback.length > 0 ? (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {flaggedFeedback.map((f) => (
                <div key={f.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{emailMap[f.user_id] ?? f.user_id}</p>
                    <span className="text-[10px] text-muted-foreground/50">{formatDate(f.created_at)}</span>
                  </div>
                  <p className="text-muted-foreground/80 mt-1.5">
                    {summaryTitleMap[f.summary_id] ?? f.summary_id} — <span className="italic">{f.reason}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRow>Nothing flagged yet.</EmptyRow>
          )}
        </Section>

        <Section title="Waitlist">
          {waitlistRows && waitlistRows.length > 0 ? (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {waitlistRows.map((w) => (
                <div key={w.email} className="px-4 py-3 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium">{w.email}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {w.role ?? "—"} · {w.newsletter_count ?? "—"} newsletters · {(w.use_cases ?? []).join(", ") || "—"}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50">{formatDate(w.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRow>No waitlist signups yet.</EmptyRow>
          )}
        </Section>
      </div>
    </div>
  );
}
