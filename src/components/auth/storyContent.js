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
  compactReply: 'Reply in your inbox',
};

/** Which caption (and progress segment) a login phase belongs to. */
export const loginCaptionIndex = (phase) => (phase >= 5 ? 2 : phase >= 3 ? 1 : 0);
