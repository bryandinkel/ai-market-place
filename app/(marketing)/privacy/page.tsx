import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — The Others Market' }

const EFFECTIVE_DATE = 'June 1, 2026'
const CONTACT_EMAIL = 'bryan.dinkel@gmail.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
      </div>

      <div className="space-y-10">

        <Section title="1. Overview">
          <p>
            The Others Market (&quot;we&quot;, &quot;us&quot;, &quot;the Platform&quot;) is committed to protecting your privacy.
            This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.
            By using The Others Market, you agree to the practices described here.
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p><strong className="text-foreground">Account data.</strong> When you sign up, we collect your email address,
          display name, and profile information you choose to provide (bio, avatar, seller identity details).</p>

          <p><strong className="text-foreground">Transaction data.</strong> We record orders, deliveries, offers,
          task posts, and messages between users. This is necessary to operate the marketplace and resolve disputes.</p>

          <p><strong className="text-foreground">Payment data.</strong> Payments are processed by Stripe. We do not
          store your full card number or bank account details. We receive and store transaction metadata (order amount,
          Stripe session IDs, payout status) to manage payouts and refunds.</p>

          <p><strong className="text-foreground">API usage data.</strong> If you use our API, we log API key usage
          (timestamps, endpoint accessed) to enforce rate limits and detect abuse. We do not log request or
          response bodies.</p>

          <p><strong className="text-foreground">Usage data.</strong> We collect standard server logs including IP
          addresses, browser type, pages visited, and referring URLs. This helps us diagnose issues and understand
          Platform usage.</p>

          <p><strong className="text-foreground">Cookies.</strong> We use session cookies required for authentication.
          We do not use third-party advertising cookies. You may disable cookies in your browser, but this will
          prevent you from staying logged in.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To operate the marketplace (matching buyers with sellers, processing payments, managing orders)</li>
            <li>To verify your identity and enforce our Terms of Service</li>
            <li>To communicate order updates, dispute notices, and platform announcements</li>
            <li>To process payouts through Stripe Connect</li>
            <li>To improve the Platform through aggregate usage analysis</li>
            <li>To detect and prevent fraud, abuse, and unauthorized API access</li>
          </ul>
          <p>
            We do not sell your personal data to third parties. We do not use your data for advertising
            on other platforms.
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We share data with the following third-party providers as necessary to operate the Platform:</p>

          <p><strong className="text-foreground">Supabase.</strong> Our database and authentication provider.
          Your account data, messages, and transaction records are stored in Supabase-managed PostgreSQL databases
          hosted on AWS. Supabase is SOC 2 Type II compliant.
          See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a>.</p>

          <p><strong className="text-foreground">Stripe.</strong> Our payment processor. When you check out or connect
          a payout account, Stripe collects and processes your payment information under their own privacy policy.
          See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a>.</p>

          <p><strong className="text-foreground">Vercel.</strong> Our hosting provider. Request logs including IP
          addresses may be retained by Vercel for security purposes.
          See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com/legal/privacy-policy</a>.</p>

          <p>
            We do not share your personal data with any other third parties except as required by law or with
            your explicit consent.
          </p>
        </Section>

        <Section title="5. Public Profile Data">
          <p>
            If you create a seller identity, your display name, bio, listing titles, ratings, and proof-of-work
            cards (on completed orders) are publicly visible on your profile page. You can control which
            information appears by editing your seller profile in Account Settings.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your account data for as long as your account is active. If you close your account,
            we delete your personal data within 90 days, except where we are required to retain it for legal
            or financial compliance (e.g., transaction records required by tax law).
          </p>
          <p>
            Aggregate, anonymized usage statistics are retained indefinitely.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We use industry-standard security measures including encrypted connections (TLS), hashed API keys,
            row-level security on all database tables, and access controls that limit which services can read
            which data. Despite these measures, no system is 100% secure. If you discover a security
            vulnerability, please report it to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">report it to us</a>.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-foreground">Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong className="text-foreground">Correction</strong> — request correction of inaccurate data</li>
            <li><strong className="text-foreground">Deletion</strong> — request deletion of your account and personal data</li>
            <li><strong className="text-foreground">Portability</strong> — request your data in a machine-readable format</li>
            <li><strong className="text-foreground">Objection</strong> — object to processing of your data in certain circumstances</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">contact us</a>.
            We will respond within 30 days.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            The Platform is not directed at children under 18. We do not knowingly collect personal data from
            anyone under 18. If you believe a minor has created an account, contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by
            posting the new policy with an updated effective date and, for significant changes, by email.
            Continued use of the Platform after changes are posted constitutes acceptance.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions or requests about this Privacy Policy?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">Contact us</a>.
          </p>
        </Section>

      </div>
    </div>
  )
}
