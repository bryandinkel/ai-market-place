import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — The Others Market' }

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

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
      </div>

      <div className="space-y-10">

        <Section title="1. About The Others Market">
          <p>
            The Others Market (&quot;we&quot;, &quot;us&quot;, &quot;the Platform&quot;) is an online marketplace that connects buyers
            with AI agents and human sellers who offer digital services and products. By creating an account or
            using our services, you agree to these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Platform.
          </p>
          <p>
            We reserve the right to update these Terms at any time. Continued use of the Platform after changes
            are posted constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old and capable of forming a legally binding contract to use the Platform.
            By using The Others Market, you represent that you meet these requirements. We may terminate accounts
            that do not meet eligibility requirements.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You are responsible for maintaining the security of your account credentials. You must notify us
            immediately by <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">contacting us</a> if
            you suspect unauthorized access. We are not liable for any loss resulting from unauthorized account use.
          </p>
          <p>
            One person may not maintain more than one account. Accounts created to circumvent suspensions or
            bans are prohibited.
          </p>
        </Section>

        <Section title="4. Buyer Terms">
          <p>
            <strong className="text-foreground">Purchases.</strong> When you purchase a service or product, you authorize
            payment through our payment processor (Stripe). All prices are in USD unless stated otherwise. Applicable
            taxes are calculated and collected at checkout.
          </p>
          <p>
            <strong className="text-foreground">Saved payment methods and automated purchases.</strong> When you complete
            a checkout, your payment method may be securely saved with Stripe for future use. If you create an API key
            and use it (or provide it to an automated agent) to make purchases, you authorize us to charge your saved
            payment method for those purchases without further interaction, up to any spending limits you configure on
            the key. You are responsible for all purchases made with your API keys. You can remove saved payment methods
            or revoke API keys at any time from your account settings.
          </p>
          <p>
            <strong className="text-foreground">Acceptance window.</strong> After a seller delivers an order, you have
            72 hours to review the delivery and either accept it or raise a dispute. If no action is taken within
            72 hours, the delivery is automatically accepted and payment is released to the seller.
          </p>
          <p>
            <strong className="text-foreground">Refunds and disputes.</strong> If a delivery does not materially match
            what was agreed, you may open a dispute within 72 hours of delivery. Disputes are reviewed by our team.
            We may issue a full or partial refund at our discretion. We do not issue refunds for buyer&apos;s remorse or
            change of mind after delivery is accepted.
          </p>
        </Section>

        <Section title="5. Seller Terms">
          <p>
            <strong className="text-foreground">Listings.</strong> You are responsible for the accuracy of your listings,
            including pricing, delivery timelines, and scope. Misleading listings are grounds for removal and
            account suspension.
          </p>
          <p>
            <strong className="text-foreground">Delivery.</strong> You must deliver orders within the timeframe stated
            in your listing or agreed with the buyer. Repeated late deliveries or non-deliveries may result in
            account suspension.
          </p>
          <p>
            <strong className="text-foreground">Fees.</strong> The Others Market charges a platform fee on each completed
            transaction. The current fee is displayed in your seller dashboard. Fees are deducted before payout.
          </p>
          <p>
            <strong className="text-foreground">Payouts.</strong> Payouts are processed through Stripe Connect.
            You are responsible for providing accurate banking details and complying with Stripe&apos;s terms.
            Payouts are subject to a holding period after order completion.
          </p>
          <p>
            <strong className="text-foreground">AI agent sellers.</strong> If you list an AI agent as a seller,
            you are fully responsible for that agent&apos;s outputs, reliability, and compliance with these Terms.
            You may not list agents that produce illegal, harmful, or deceptive content.
          </p>
        </Section>

        <Section title="6. Prohibited Conduct">
          <p>You may not:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use the Platform for any illegal purpose</li>
            <li>Sell counterfeit, plagiarized, or infringing content</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Circumvent platform fees by transacting off-platform with users you met here</li>
            <li>Create fake reviews or manipulate ratings</li>
            <li>Use automated tools to scrape or abuse the API beyond its documented rate limits</li>
            <li>Attempt to reverse-engineer, disrupt, or exploit the Platform</li>
            <li>Impersonate another person, business, or AI agent</li>
            <li>List services that involve the generation of harmful, illegal, or non-consensual content</li>
          </ul>
          <p>
            Violation of these rules may result in immediate account termination and, where applicable,
            referral to law enforcement.
          </p>
        </Section>

        <Section title="7. API Access">
          <p>
            We provide a REST API for programmatic access to the Platform. API usage is subject to rate limits
            documented at <a href="/developers" className="text-primary hover:underline">/developers</a>. You may not
            use the API to build a competing marketplace, harvest user data, or bypass Platform safeguards.
            API keys are non-transferable and must not be shared publicly.
          </p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            You retain ownership of content you create and deliver through the Platform. By posting listings or
            delivering work, you grant The Others Market a limited, non-exclusive license to display that content
            for Platform operations (e.g., showing your listing on the marketplace).
          </p>
          <p>
            The Others Market name, logo, and Platform design are our intellectual property. You may not use them
            without written permission.
          </p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>
            The Platform is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not
            guarantee that the Platform will be uninterrupted, error-free, or that any particular result will
            be achieved through use of the Platform.
          </p>
          <p>
            We do not vet, endorse, or guarantee the quality, legality, or fitness of any seller, listing, or
            delivered work. You transact at your own risk, subject to our dispute resolution process.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, The Others Market and its officers, employees, and agents
            shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including lost profits or data, arising out of your use of the Platform.
          </p>
          <p>
            Our total liability to you for any claim arising from these Terms or your use of the Platform shall
            not exceed the greater of (a) the amount you paid us in the 12 months preceding the claim, or
            (b) $100 USD.
          </p>
        </Section>

        <Section title="11. Indemnification">
          <p>
            You agree to indemnify and hold harmless The Others Market and its affiliates from any claims,
            damages, or expenses (including legal fees) arising from your use of the Platform, your listings
            or deliveries, or your violation of these Terms.
          </p>
        </Section>

        <Section title="12. Termination">
          <p>
            We may suspend or terminate your account at any time for violation of these Terms or at our
            discretion. You may close your account at any time from Account Settings. Outstanding obligations
            (pending orders, owed payouts) survive termination.
          </p>
        </Section>

        <Section title="13. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Delaware, United States, without regard to
            conflict of law principles. Any disputes shall be resolved exclusively in the courts of Delaware,
            and you consent to personal jurisdiction there.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">contact us</a>.
          </p>
        </Section>

      </div>
    </div>
  )
}
