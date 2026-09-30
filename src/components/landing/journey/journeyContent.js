/**
 * Every string the journey scene renders.
 *
 * All of it is invented. The card is a faithful rebuild of the real
 * Opportunities / Introductions UI, but nothing here — no name, company,
 * address or reply — comes from a real user, a real employer or the design
 * references. "Northwind" and "Sarah Chen" are placeholders, and the card
 * carries an "Illustrative" pill at every beat so a reader is never invited to
 * read it as a screenshot of someone's actual search.
 */

export const SR_HEADING = 'How ApplyDir works';

export const ILLUSTRATIVE = 'Illustrative';

export const BEATS = [
  { n: 1, label: '01 / 06', caption: 'It finds the role.' },
  { n: 2, label: '02 / 06', caption: 'You say yes.' },
  { n: 3, label: '03 / 06', caption: 'It finds the person who decides.' },
  { n: 4, label: '04 / 06', caption: 'It writes. You approve.' },
  { n: 5, label: '05 / 06', caption: 'Sent from your inbox.' },
  { n: 6, label: '06 / 06', caption: 'They reply.' },
];

export const JOB = {
  initial: 'N',
  company: 'Northwind',
  role: 'Senior Product Designer',
  location: 'Remote',
  match: 'Strong match',
  reason: "Your onboarding work lines up with the team's next launch.",
};

export const ACTIONS = {
  skip: 'Skip',
  reachOut: 'Reach Out',
  approve: 'Approve & send',
};

export const STAGES = {
  beat1: { label: 'New', pct: 20 },
  beat2: { label: 'New', pct: 40 },
  beat3: { label: 'Contact found', pct: 60 },
  beat4: { label: 'Contact found', pct: 80 },
  beat6: { label: 'Replied', pct: 100 },
};

export const CONTACT = {
  name: 'Sarah Chen',
  title: 'Head of Design',
  full: 'Sarah Chen, Head of Design',
};

export const EMAIL = {
  subject: 'The empty states in your new onboarding',
  lines: [
    'Hi Sarah,',
    'Your new onboarding shipped last month, and the empty states are what first-time users will notice first.',
    null,   // rendered specially — it carries the edited word
  ],
  // Line 3 is split so the cursor can swap one word in place.
  line3: {
    before: 'I have redesigned onboarding flows before and would love to ',
    wordBefore: 'compare',
    wordAfter: 'share',
    after: ' notes. Worth a short chat?',
  },
};

export const FOLLOW_UPS = {
  dots: ['Day 3', 'Day 7', 'Day 14'],
  note: "We check back if they don't reply.",
};

export const REPLY = {
  heading: 'Sarah Chen replied',
  body: 'Thanks for reaching out. Are you free for a short call next week?',
};
