/**
 * Every string the "other way" section renders.
 *
 * The comparison is deliberately unbalanced in layout but even-handed in
 * wording: the left stage shows what auto-appliers actually do, not a straw
 * man, and the rows read as three plain facts rather than a scorecard.
 */

export const SECTION = {
  eyebrow: 'WHY NOT AUTO-APPLY',
  heading: 'They apply faster. You skip the line.',
};

export const PANELS = {
  left: {
    label: 'Auto-apply',
    caption: 'One more CV in the pile.',
    /** Drawn inside the funnel. */
    funnel: 'ATS',
    /** Lands on roughly every third CV once it hits the pile. */
    stamp: 'No reply',
  },
  right: {
    label: 'ApplyDir',
    caption: 'Your name in front of the person who decides.',
    avatar: 'Hiring manager',
    inbox: 'Inbox',
    /** The two lines that appear in the inbox once the introduction lands. */
    rows: [
      { text: 'New introduction from you', tone: 'primary' },
      { text: 'Delivered', tone: 'emerald' },
    ],
  },
};

export const ROWS = [
  { label: 'What gets sent', auto: 'A form',        ours: 'A personal introduction' },
  { label: 'Who sees it',    auto: 'An ATS filter', ours: 'The hiring manager' },
  { label: 'The bet',        auto: 'Volume',        ours: 'The right person' },
];
