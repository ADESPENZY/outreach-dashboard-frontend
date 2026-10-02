/**
 * Every string and number the "reach" section renders.
 *
 * The titles are real ones from the pilot, carried over by hand — nothing here
 * is read from an export at build time, and no name, email address or company
 * appears anywhere in this file. The sector line is the sector, never the
 * employer.
 */

export const SECTION = {
  eyebrow: 'WHO IT REACHES',
  heading: 'Not an inbox called careers@. The people who decide.',
  footnote: 'Pilot data, May to October 2026. Real job titles. Names and companies removed.',
};

/**
 * `value` is what the DOM carries from the first render, so a crawler and a
 * reader with reduced motion both see the real figure. `to` is what the
 * count-up climbs to; a stat without it simply fades in.
 */
export const STATS = [
  { value: '533', to: 533, label: 'introductions sent in our pilot' },
  { value: '467', to: 467, label: 'different companies' },
  { value: '1 in 2', to: null, label: 'went to a director or above' },
];

export const STREAM_LABEL = 'A sample of the job titles ApplyDir introduced people to';

export const STREAM_ROWS = [
  [
    { title: 'Chief Technology Officer', sector: 'Software' },
    { title: 'Chief Medical Officer', sector: 'Healthcare' },
    { title: 'Director of Talent Acquisition', sector: 'Financial services' },
    { title: 'Head of Engineering', sector: 'Software' },
    { title: 'Associate Chief Nursing Officer', sector: 'Healthcare' },
    { title: 'VP of Engineering', sector: 'Developer tools' },
    { title: 'Group Head of Recruitment', sector: 'Consumer' },
    { title: 'Chief Operating Officer', sector: 'Healthcare' },
  ],
  [
    { title: 'Medical Director', sector: 'Life sciences' },
    { title: 'Head of Talent Acquisition', sector: 'Insurance' },
    { title: 'Senior Director of Talent Acquisition', sector: 'Fintech' },
    { title: 'Chief Executive Officer', sector: 'Health tech' },
    { title: 'Engineering Manager', sector: 'Payments' },
    { title: 'VP, Operations', sector: 'Recruiting tech' },
    { title: 'Director of Human Resources', sector: 'Healthcare' },
    { title: 'Executive Director, Talent Acquisition', sector: 'Biotech' },
  ],
];

/**
 * Seniority mix. Shares are rounded to whole points and sum to 100 — the bar
 * is a stacked percentage, so anything else would leave a visible gap.
 *
 * The four senior bands carry brand orange at falling opacity; everything
 * below them is stone. That is the argument the bar is making, so the colour
 * does the work and the legend only names the parts.
 */
export const SENIORITY = [
  { label: 'C-level / founder',               pct: 26, color: 'rgba(255, 91, 46, 1)' },
  { label: 'VP',                              pct: 10, color: 'rgba(255, 91, 46, 0.8)' },
  { label: 'Head of',                         pct: 9,  color: 'rgba(255, 91, 46, 0.65)' },
  { label: 'Director',                        pct: 16, color: 'rgba(255, 91, 46, 0.5)' },
  { label: 'Manager',                         pct: 25, color: '#D6D1CC' },
  { label: 'Talent acquisition',              pct: 6,  color: '#E4E0DC' },
  { label: 'Individual contributor and other', pct: 8,  color: '#EDEAE7' },
];

export const BAR_LABEL = 'Seniority of the people introduced to, as a share of all introductions';
