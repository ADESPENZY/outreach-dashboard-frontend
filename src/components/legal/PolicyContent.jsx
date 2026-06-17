import React from 'react';
import { Shield } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for ApplyDir's Privacy Policy & Terms.
// Rendered both in Settings → Legal (authenticated) and on the public
// /privacy and /terms pages, so the text can never drift between the two.
// ─────────────────────────────────────────────────────────────────────────────

function Card({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-dark">
        <h3 className="text-base font-bold font-montserrat text-black">{title}</h3>
        {description && <p className="text-sm mt-0.5 text-secondary-dark">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Policy({ heading, children }) {
  return (
    <div>
      <p className="text-sm font-bold text-black-light mb-1.5">{heading}</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-secondary-dark leading-relaxed">{children}</ul>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <Card
      title="Privacy Policy"
      description={`Last updated ${new Date().getFullYear()}. Plain-language summary of how ApplyDir handles your data.`}
    >
      <Policy heading="What we collect">
        <li><b>Account</b> — your email, username, and (for password sign-ups) a securely hashed password.</li>
        <li><b>Profile</b> — your CV text, contact details, links, Calendly, and AI-extracted skills/projects.</li>
        <li><b>Connected inboxes</b> — the Gmail address and an app password, stored <b>encrypted</b> (Fernet), used only to send your outreach.</li>
        <li><b>Generated content &amp; activity</b> — the jobs, contacts, emails, and CVs the system creates for you, plus open/reply events.</li>
      </Policy>
      <Policy heading="How we use it">
        <li>To find roles, score them against your CV, find contacts, and write &amp; send <b>your</b> cold emails and tailored CVs.</li>
        <li>To send you product emails (welcome, daily scout digest, re-engagement). We never use your connected inbox for our own marketing.</li>
        <li><b>To improve the product</b> — we analyse <b>aggregated and anonymised</b> usage (e.g. which email strategies get more replies, where users get stuck) so the service gets better for everyone.</li>
        <li><b>For anonymised benchmarks</b> — we may publish aggregate, de-identified statistics (e.g. "average open rate across users"). These never identify you or any individual recipient.</li>
      </Policy>
      <Policy heading="Your content & our license">
        <li><b>You own your content.</b> We don't claim ownership of your CV, emails, or contacts. You grant us a limited license to <b>process</b> that content only to provide and improve the service.</li>
        <li>We <b>do not sell</b> your personal data, and we <b>do not use it to train AI models</b>. Any product improvement uses aggregated/anonymised data only.</li>
        <li>Data obtained from Gmail/Google APIs is used <b>solely to send email on your behalf</b> — never for analytics, benchmarks, advertising, or model training (Google API Services <b>Limited Use</b> policy).</li>
      </Policy>
      <Policy heading="Who we share it with (processors only — we never sell your data)">
        <li><b>OpenAI</b> — CV scoring, email &amp; CV generation.</li>
        <li><b>Apify, Hunter, Apollo, Serper</b> — job scraping &amp; contact discovery.</li>
        <li><b>Google / Gmail</b> — sending your emails via SMTP from your own inbox.</li>
        <li><b>Resend</b> — our transactional emails to you.</li>
        <li><b>Supabase, Render, Vercel</b> — database &amp; hosting.</li>
      </Policy>
      <Policy heading="Legal basis (where GDPR/UK GDPR applies)">
        <li><b>Contract</b> — to deliver the service you signed up for.</li>
        <li><b>Consent</b> — for optional emails and any future use of your data beyond running the service; you can withdraw it any time.</li>
        <li><b>Legitimate interests</b> — security, fraud prevention, and aggregated/anonymised product analytics.</li>
      </Policy>
      <Policy heading="Your Gmail data">
        <li>We store your app password encrypted and use it <b>solely to send</b> email on your behalf. We do not read your inbox. You can disconnect an inbox at any time from <b>Inboxes</b>.</li>
      </Policy>
      <Policy heading="Your rights">
        <li>View &amp; edit everything in <b>Profile</b>. Export your CV as PDF. Withdraw optional-email consent in <b>Settings → Notifications</b>. <b>Delete your account</b> any time (Settings → Danger Zone) — this permanently erases your data. We retain your data only until you delete your account.</li>
      </Policy>
      <Policy heading="International transfers, security & changes">
        <li>Your data may be processed outside your country by the processors above, under their standard safeguards.</li>
        <li>We protect data with encryption in transit and at rest, and encrypt inbox credentials at the field level.</li>
        <li>If we materially change this policy, we'll notify you by email or in-app before it takes effect.</li>
      </Policy>
    </Card>
  );
}

export function TermsOfService() {
  return (
    <Card title="Terms of Service" description="The deal between you and ApplyDir.">
      <Policy heading="Your responsibilities">
        <li>You own (or are authorized to use) every inbox you connect.</li>
        <li>You are responsible for the emails you send and for complying with anti-spam and privacy law in your and your recipients' jurisdictions (e.g. CAN-SPAM, GDPR, CASL) and with Google's terms.</li>
        <li>No purchased lists, spam, harassment, deception, or illegal content. Outreach must be genuine and relevant.</li>
      </Policy>
      <Policy heading="Positioning & representations">
        <li>Tools that help you present as a fractional/contract engineer are aids only. You are responsible for the accuracy of your CV, your claims, and any agreement you enter with a company.</li>
      </Policy>
      <Policy heading="No guarantees">
        <li>ApplyDir is a tool, not an employment agency. We don't guarantee interviews, offers, or any outcome. Deliverability depends on your sending behaviour and inbox reputation.</li>
      </Policy>
      <Policy heading="Acceptable use & suspension">
        <li>We may pause or remove accounts that abuse the system, spam, or threaten the deliverability of the shared sending pool.</li>
      </Policy>
      <Policy heading="Service & liability">
        <li>The service is provided "as is" and relies on third-party APIs that may change or fail. To the extent permitted by law, our liability is limited to the fees you paid in the prior month.</li>
      </Policy>
    </Card>
  );
}

export function LegalDisclaimer() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-neutral border border-neutral-dark">
      <Shield className="w-4 h-4 text-secondary-dark/60 mt-0.5 shrink-0" />
      <p className="text-xs text-secondary-dark">
        This is a plain-language summary written for clarity. Questions: <a href="mailto:support@applydir.com" className="font-semibold text-primary-dark hover:underline">support@applydir.com</a>.
      </p>
    </div>
  );
}

// Convenience: all sections stacked (used by Settings → Legal).
export function LegalSections() {
  return (
    <div className="space-y-5">
      <PrivacyPolicy />
      <TermsOfService />
      <LegalDisclaimer />
    </div>
  );
}
