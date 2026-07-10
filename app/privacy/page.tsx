import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Data Notice — Pidgin",
  description: "What data Pidgin collects from study participants, and why.",
};

const LAST_UPDATED = "July 9, 2026";
const CONTACT_EMAIL = "hello@pidgin.site";
const STUDY_END_DATE = "the last week of August 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pidgin-main.png"
              alt="Pidgin"
              className="w-6 h-6 rounded-md"
            />
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              Pidgin
            </span>
          </a>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Research Data Notice
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <div className="mb-10 p-5 rounded-2xl bg-secondary/40 border border-border/50">
          <p className="text-sm leading-relaxed text-foreground/80">
            Pidgin is a research study, not a commercial product. This notice
            explains what data we collect from participants, why, and how long
            we keep it. We don&apos;t sell your data, ever.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold mb-3">What we collect</h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  <strong className="text-foreground">
                    Account information
                  </strong>{" "}
                  — your name and email address, collected via Clerk when you
                  join the study.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  <strong className="text-foreground">Gmail access</strong> —
                  read-only access to your inbox, for the purposes of this study
                  only. Pidgin can never send, modify, or delete mail. To be
                  precise about what read-only means: Google grants access to
                  the whole mailbox, and Pidgin is built to request only
                  newsletters from it — messages Gmail files under Promotions or
                  Updates that carry the <code>List-Unsubscribe</code> header
                  that bulk mail is required to set. Personal emails, drafts,
                  and sent mail are never fetched, never sent to any AI model,
                  and never stored. There&apos;s no manual sender allow-list:
                  every newsletter we detect is scanned, and our ranking (not a
                  pre-approved sender list) decides what surfaces in your brief.
                  You can block any sender at any time, and revoke Pidgin&apos;s
                  access entirely from your{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Google account permissions
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  <strong className="text-foreground">
                    Newsletter content
                  </strong>{" "}
                  — the body of newsletter emails is sent to Anthropic&apos;s
                  Claude API to generate summaries, &ldquo;why it matters&rdquo; and &ldquo;what
                  to do&rdquo; framing, significance ratings, and topic clustering (so
                  the same story from different newsletters doesn&apos;t show up
                  twice). Content is not stored by Anthropic for training.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  <strong className="text-foreground">Newsletter body</strong> —
                  the original email content is only used to generate your brief
                  and is cleared from our database after 7 days, including for
                  stories you&apos;ve bookmarked. A bookmark keeps the summary,
                  not the original email.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  <strong className="text-foreground">Brief history</strong> —
                  AI-generated summaries, key points, and category tags are kept
                  for up to 180 days, or until the study ends (whichever comes
                  first), so we can evaluate whether recognizing recurring
                  stories over time is useful then automatically deleted.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  <strong className="text-foreground">Usage data</strong> —
                  anonymous product analytics via PostHog (pages visited,
                  features used), used to evaluate the study, not to run a
                  commercial product. No personal data is attached.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              What we don&apos;t collect
            </h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>
                  Personal emails, drafts, sent mail, or any non-newsletter
                  inbox content
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>
                  Payment information (this is a research study and we
                  don&apos;t charge participants)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>
                  Data from contacts or anyone who didn&apos;t join the study
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Why we collect it</h2>
            <p className="text-foreground/75 mb-3">
              This study exists to evaluate whether the underlying product
              concept is something people find useful. We use participant data
              to:
            </p>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Fetch and analyze newsletters into a ranked brief, as a
                  working prototype of the concept
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Recognize when a topic recurs over time (trend memory), to
                  test whether that&apos;s valuable
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Send a daily brief email, when something clears the bar
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Assess study outcomes whether this concept works and whether
                  people want it
                </span>
              </li>
            </ul>
            <p className="mt-3 text-foreground/75">
              We do not sell, rent, or share participant data with third parties
              for marketing purposes. We do not use it to build or operate a
              commercial product beyond this study without separately notifying
              participants and obtaining fresh consent see &quot;Future
              use&quot; below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Third-party services
            </h2>
            <div className="space-y-2 text-foreground/75">
              <p>Pidgin uses the following services to run this study:</p>
              <ul className="space-y-2 mt-3">
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                  <span>
                    <strong className="text-foreground">Clerk</strong> —
                    authentication and participant management
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                  <span>
                    <strong className="text-foreground">
                      Google Gmail API
                    </strong>{" "}
                    — read-only inbox access
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                  <span>
                    <strong className="text-foreground">
                      Anthropic Claude
                    </strong>{" "}
                    — AI summarization
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                  <span>
                    <strong className="text-foreground">Supabase</strong> —
                    database storage
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                  <span>
                    <strong className="text-foreground">Resend</strong> — email
                    delivery
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                  <span>
                    <strong className="text-foreground">PostHog</strong> —
                    anonymous analytics
                  </span>
                </li>
              </ul>
              <p className="mt-3">
                Each service operates under its own privacy policy and data
                processing terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Data retention — tied to the study
            </h2>
            <p className="text-foreground/75">
              All data collected for this study, including account data, is
              deleted no later than {STUDY_END_DATE} (the end of the study
              period), or within 30 days of you withdrawing, whichever comes
              first. Within that window: original newsletter content is cleared
              after 7 days, and derived summaries/key points/topic history are
              kept for up to 180 days (unless you bookmark a story, in which
              case they&apos;re kept until you delete them) this is what lets us
              test whether noticing recurring stories is valuable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Future use</h2>
            <p className="text-foreground/75">
              If, after this study, we decide to build Pidgin into a commercial
              product, that will be a separate undertaking with its own terms.
              We will not continue processing your Gmail data or study data
              under a commercial relationship, and we will not use your data to
              build that product, without first asking you for fresh, explicit
              consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">How your data is secured</h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Pidgin never sees your Google password. Access is granted
                  through Google&apos;s standard OAuth consent screen, and the
                  only permissions requested are read-only Gmail and your email
                  address.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  The resulting access tokens are encrypted at rest
                  (AES-256-GCM) before being stored, so a database leak alone
                  does not expose access to your inbox.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Every request is scoped to the signed-in account. Your
                  newsletters, summaries, and history are never readable by
                  another participant.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Data travels over TLS in transit, and shared summary links are
                  opt-in — nothing is published unless you choose to share it.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Your rights</h2>
            <p className="text-foreground/75 mb-3">
              You can disconnect Gmail at any time from your dashboard, which
              immediately revokes Pidgin&apos;s access with Google and deletes
              the stored tokens. You can also revoke access directly from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Google account permissions
              </a>{" "}
              — that works whether or not Pidgin is running.
            </p>
            <p className="text-foreground/75 mb-3">
              You can delete your account at any time from the account menu in
              your dashboard. This revokes Gmail access with Google, erases
              every summary and all topic history, and deletes your account —
              immediately, and without needing to ask us.
            </p>
            <p className="text-foreground/75">
              You can also withdraw from the study or ask questions about your
              data by emailing{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
              . We&apos;ll action it within 72 hours.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Changes to this notice
            </h2>
            <p className="text-foreground/75">
              If we make material changes, we&apos;ll notify participants by
              email before they take effect. The &ldquo;last updated&rdquo; date at the top
              of this page will always reflect the current version.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Contact</h2>
            <p className="text-foreground/75">
              Questions about the study? Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border/50 flex items-center gap-6 text-xs text-muted-foreground">
          <a href="/terms" className="hover:text-foreground transition-colors">
            Research Participation Notice
          </a>
          <a
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            Back to app
          </a>
        </div>
      </div>
    </div>
  );
}
