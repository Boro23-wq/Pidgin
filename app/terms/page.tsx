import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Participation Notice — Pidgin",
  description: "What it means to take part in the Pidgin research study.",
};

const LAST_UPDATED = "July 9, 2026";
const CONTACT_EMAIL = "hello@pidgin.site";
const STUDY_END_DATE = "the last week of August 2026";

export default function TermsPage() {
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
            Research Participation Notice
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <div className="mb-10 p-5 rounded-2xl bg-secondary/40 border border-border/50">
          <p className="text-sm leading-relaxed text-foreground/80">
            Pidgin is currently a research prototype, not a commercial product.
            By participating, you&apos;re taking part in an early-stage study to
            validate a product concept and not entering into a commercial
            service agreement. This page explains what that means in plain
            English.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold mb-3">What this is</h2>
            <p className="text-foreground/75">
              Pidgin is a research prototype exploring whether a &quot;Founder
              Intelligence System&quot; an AI-generated daily brief built from
              your newsletter subscriptions is something people find useful. It
              connects to your Gmail, reads your newsletter subscriptions, and
              turns them into a ranked daily brief. This is not a commercial
              service: there are no fees, no service-level guarantees, and no
              ongoing obligation on our part to keep the prototype running.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Who can participate
            </h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  Participation is by direct, personal invitation only. It is
                  not open to public sign-up, and invite links should not be
                  shared.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>
                  You are responsible for keeping your account secure.
                  Don&apos;t share your credentials.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                <span>You must be at least 13 years old to participate.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Study duration</h2>
            <p className="text-foreground/75">
              This study is time-boxed and currently expected to run through{" "}
              {STUDY_END_DATE}. The prototype may be modified, paused, or
              discontinued at any time without notice, since it is a study
              rather than a product with continuity guarantees. We&apos;ll let
              participants know if the study wraps up early.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              No service guarantees
            </h2>
            <p className="text-foreground/75">
              Because Pidgin is not a commercial service, we don&apos;t
              guarantee uptime, data continuity, feature stability, or ongoing
              support. Treat anything you see in the prototype as provisional
              and subject to change without notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Gmail access</h2>
            <p className="text-foreground/75">
              When you connect Gmail, you grant Pidgin read-only access to
              identify newsletter emails, solely for the purposes of this study.
              We only access newsletters, not personal emails, drafts, or sent
              mail. You can revoke access at any time from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Google account settings
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              AI-generated content
            </h2>
            <p className="text-foreground/75">
              Summaries, key points, &ldquo;why it matters&rdquo; and &ldquo;what to do&rdquo; framing,
              significance ratings, and trend/recurrence detection are all
              generated by AI and may not be perfectly accurate. They are
              intended as a convenience for the purposes of this study, not a
              replacement for reading the original source. Always refer to the
              original newsletter for important decisions. Pidgin is not
              responsible for errors in AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Acceptable use</h2>
            <p className="text-foreground/75 mb-3">
              As a participant, you agree not to:
            </p>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>Attempt to access other participants&apos; data</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>Reverse engineer or scrape the prototype</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>Use Pidgin to generate or distribute spam</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                  –
                </span>
                <span>Overload our systems with automated requests</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Withdrawing from the study
            </h2>
            <p className="text-foreground/75">
              You may stop participating and request deletion of your data at
              any time by emailing{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              or disconnecting Gmail from your Google account settings.
              Withdrawal has no consequence beyond ending your participation,
              and your data is removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              No commercial relationship
            </h2>
            <p className="text-foreground/75">
              Nothing in this notice creates a contract for a commercial
              service, a subscription, or continued access. We may use
              anonymized, aggregate findings from this study to decide whether
              to build a commercial product in the future but that would be a
              separate undertaking with its own terms, not a continuation of
              this study.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Intellectual property
            </h2>
            <p className="text-foreground/75">
              Pidgin and its logo are our intellectual property. The newsletter
              content we summarize belongs to its respective publishers and
              Pidgin does not claim ownership of any summarized content.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Limitation of liability
            </h2>
            <p className="text-foreground/75">
              Pidgin is provided &ldquo;as is,&rdquo; as a research prototype. To the extent
              permitted by law, we are not liable for indirect, incidental, or
              consequential damages arising from your participation in this
              study.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Changes to this notice
            </h2>
            <p className="text-foreground/75">
              We may update this notice. If the changes are material, we&apos;ll
              notify participants by email at least 7 days before they take
              effect. Continued participation after that constitutes acceptance.
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
          <a
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Research Data Notice
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
