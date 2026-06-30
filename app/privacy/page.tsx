import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Pidgin",
  description: "How Pidgin handles your data.",
};

const LAST_UPDATED = "June 30, 2025";
const CONTACT_EMAIL = "hello@pidgin.site";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24">

        {/* Header */}
        <div className="mb-12">
          <a href="/" className="inline-flex items-center gap-2 mb-8 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Pidgin</span>
          </a>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
        </div>

        {/* Intro */}
        <div className="mb-10 p-5 rounded-2xl bg-secondary/40 border border-border/50">
          <p className="text-sm leading-relaxed text-foreground/80">
            Pidgin is a newsletter digest tool. We access your Gmail to find newsletter emails, summarize them with AI, and deliver a daily digest. We don't sell your data, ever. This page explains exactly what we collect and why.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold mb-3">What we collect</h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Account information</strong> — your name and email address, collected via Clerk when you sign up.</span></li>
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Gmail access</strong> — read-only access to your inbox to identify and fetch newsletter emails. We never read personal emails, only newsletters from known senders.</span></li>
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Newsletter content</strong> — the body of newsletter emails is sent to Anthropic's Claude API to generate summaries. Content is not stored by Anthropic for training.</span></li>
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Summaries</strong> — AI-generated summaries, key points, and category tags are stored in our database (Supabase) and kept for 7 days, then automatically deleted.</span></li>
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Usage data</strong> — anonymous product analytics via PostHog (pages visited, features used). No personal data is attached.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">What we don't collect</h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2"><span className="text-muted-foreground mt-0.5 flex-shrink-0">–</span><span>Personal emails, drafts, sent mail, or any non-newsletter inbox content</span></li>
              <li className="flex gap-2"><span className="text-muted-foreground mt-0.5 flex-shrink-0">–</span><span>Payment information (we don't charge for alpha)</span></li>
              <li className="flex gap-2"><span className="text-muted-foreground mt-0.5 flex-shrink-0">–</span><span>Data from contacts or anyone who didn't sign up for Pidgin</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">How we use your data</h2>
            <ul className="space-y-2 text-foreground/75">
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span>To fetch and summarize your newsletters</span></li>
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span>To send your daily digest email</span></li>
              <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span>To improve the product based on anonymous usage patterns</span></li>
            </ul>
            <p className="mt-3 text-foreground/75">We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Third-party services</h2>
            <div className="space-y-2 text-foreground/75">
              <p>Pidgin uses the following services to operate:</p>
              <ul className="space-y-2 mt-3">
                <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Clerk</strong> — authentication and user management</span></li>
                <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Google Gmail API</strong> — read-only inbox access</span></li>
                <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Anthropic Claude</strong> — AI summarization</span></li>
                <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Supabase</strong> — database storage</span></li>
                <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">Resend</strong> — email delivery</span></li>
                <li className="flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span><strong className="text-foreground">PostHog</strong> — anonymous analytics</span></li>
              </ul>
              <p className="mt-3">Each service operates under its own privacy policy and data processing terms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Data retention</h2>
            <p className="text-foreground/75">Newsletter summaries are automatically deleted after 7 days unless you bookmark them. Bookmarked items are kept until you delete them or close your account. Your account data is deleted within 30 days of account deletion.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Your rights</h2>
            <p className="text-foreground/75">You can disconnect Gmail, delete your account, or request deletion of all your data at any time by emailing <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:text-primary/80 transition-colors">{CONTACT_EMAIL}</a>. We'll action it within 72 hours.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Changes to this policy</h2>
            <p className="text-foreground/75">If we make material changes, we'll notify you by email before they take effect. The "last updated" date at the top of this page will always reflect the current version.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">Contact</h2>
            <p className="text-foreground/75">Questions? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:text-primary/80 transition-colors">{CONTACT_EMAIL}</a>.</p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border/50 flex items-center gap-6 text-xs text-muted-foreground">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          <a href="/dashboard" className="hover:text-foreground transition-colors">Back to app</a>
        </div>

      </div>
    </div>
  );
}
