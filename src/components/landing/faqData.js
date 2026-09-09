// Shared so FaqSection can render these and LandingPage can emit the matching
// FAQPage JSON-LD from one source. Kept out of the component file because
// fast-refresh requires component modules to export only components.
export const FAQS = [
  {
    q: 'Does it send emails without me?',
    a: 'No. Every introduction waits in a queue until you read it and approve it. Follow-ups are drafted the same way and are always tied to a message you already approved.',
  },
  {
    q: 'Whose email address does it send from?',
    a: 'Yours. You connect your own Gmail or Outlook mailbox and the message goes out from it, so the recipient sees a normal email from a person, not a relay.',
  },
  {
    q: 'Will this hurt my inbox reputation?',
    a: 'It is built to avoid that. There is a small daily ceiling, a minimum gap between sends, a warm-up period on newer mailboxes, and one introduction per company ever.',
  },
  {
    q: 'What if it invents things about me?',
    a: 'It cannot. Every claim with a number in it is checked against your CV before the email leaves. If the source is not there, the claim is stripped or the email is not sent.',
  },
  {
    q: 'Do I need to be in tech?',
    a: 'No. It works across nursing, caregiving, healthcare administration, sales, marketing, operations, finance, education and more, and it targets the right kind of decision-maker for each.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing today. It is free while we are in early access, and the tiers shown on this page are placeholders while we work out a fair model.',
  },
  {
    q: 'How is this different from an auto-applier?',
    a: 'Auto-appliers submit forms into applicant tracking systems faster. ApplyDir skips the form and emails the person who owns the hire, which is how strong candidates actually get seen.',
  },
];
