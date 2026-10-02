/**
 * Every string and sample value the auth stories show.
 *
 * Illustrative only: no numbers, no company names, no real people. Never add
 * invented reply text; the reply stays grey bars until a real anonymised one
 * is supplied.
 */

export const LOGIN_STORY = {
  eyebrow: 'After you approve',
  // One caption per progress segment. Phases 1-2, 3-4, 5.
  captions: [
    'Your introduction lands in their inbox.',
    'No answer yet? We follow up for you.',
    'They reply. The follow-ups stop.',
  ],
  inbox: {
    name: 'Hiring manager',
    label: 'Inbox',
    newIntro: 'New introduction from you',
    delivered: 'Delivered',
  },
  timeline: [
    { label: 'Sent', sub: 'Introduction' },
    { label: 'Day 3', sub: 'Follow-up' },
    { label: 'Day 7', sub: 'Follow-up' },
    { label: 'Day 14', sub: 'Follow-up' },
  ],
  cancelled: 'Cancelled',
  reply: {
    eyebrow: 'Your inbox',
    from: 'Reply from the hiring manager',
    bars: [92, 78, 44], // % widths of the placeholder reply lines
    stopped: 'Follow-ups stopped',
  },
};

/** Which caption (and progress segment) a login phase belongs to. */
export const loginCaptionIndex = (phase) => (phase >= 5 ? 2 : phase >= 3 ? 1 : 0);

/*
 * Signup: "the introduction gets written". The role, the person and the email
 * are illustrative only: no numbers, no company names, no real people, and no
 * em dashes in the sample email.
 */
export const SIGNUP_STORY = {
  eyebrow: 'How an introduction happens',
  // One caption per progress segment. Phases 1, 2, 3, 4-5.
  captions: [
    'We find a role that fits you.',
    'Then the person who hires for it.',
    'We write your introduction.',
    'You approve. It sends from your inbox.',
  ],
  role: {
    eyebrow: 'Role',
    title: 'Product Marketing Manager',
    fit: 'Fits your experience',
  },
  person: {
    name: 'Amara N.',
    title: 'Head of Marketing',
    chip: 'Hires for this role',
  },
  intro: {
    to: 'To Amara N.',
    from: 'From your own inbox',
    subject: 'Your Product Marketing Manager role',
    body:
      "Hi Amara, I saw you're hiring a Product Marketing Manager. I led the launch work this role describes, and I'd like to show you how I'd approach it.",
    footer: 'Drafted from your CV. Nothing invented.',
    approve: 'Approve',
    sent: 'Approved and sent',
  },
};

/** Which caption (and progress segment) a signup phase belongs to. */
export const signupCaptionIndex = (phase) => (phase >= 4 ? 3 : phase === 3 ? 2 : phase === 2 ? 1 : 0);

/** Phone-only intro slides before the signup form (§6). */
export const INTRO_SLIDES = [
  {
    title: 'We find roles that fit you.',
    body: 'Not every opening. The ones your experience matches.',
  },
  {
    title: 'Then the person who hires.',
    body: 'A named hiring manager, not a careers inbox.',
  },
  {
    title: 'Your introduction, your words.',
    body: 'Drafted from your CV. You approve every message before it sends.',
  },
];
