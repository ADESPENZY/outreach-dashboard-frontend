import { useState } from 'react';
import { Section, Eyebrow, Heading, Lead, Reveal } from './primitives';

/**
 * The centrepiece. Competitors can only show a form being filled in; this shows
 * the artefact the product actually produces.
 *
 * Both samples are illustrative and labelled as such. Real emails are generated
 * per user and every number in them is checked against the CV before sending
 * (outreach/grounding.py), which is the point the caption makes.
 */
const SAMPLES = {
  standard: {
    tab: 'Today',
    subject: 'the reliability work behind your payments launch',
    lines: [
      'Hi Dana,',
      'You shipped instant payouts last month and the changelog mentions retries were the hard part. That is usually where the on-call pain shows up next.',
      'I spent the last three years on transaction reliability at a payments company, and cut failed-settlement retries by about a third by moving them off the request path.',
      'Worth a short conversation? If this is not your area, a pointer to whoever owns it would be great.',
    ],
    notes: [
      { at: 1, text: 'Real detail about them, not a mail-merge token' },
      { at: 2, text: 'A number from your CV — never invented' },
      { at: 3, text: 'One ask, and a graceful way to say no' },
    ],
  },
  niche: {
    tab: 'For copywriters',
    badge: 'In build',
    subject: 'your pricing page buries the offer',
    lines: [
      'Hi Dana,',
      'Your pricing page opens with “Flexible plans for every team” — which is also what your three closest competitors say. The actual offer, unlimited seats with no per-user math, does not appear until the third card.',
      'Two lines you could test this week:\n— “Unlimited seats. One price. No per-user math.”\n— “Stop paying per head. Flat rate, however big you get.”',
      'I write pricing and lifecycle copy. If the content role is still open I would love to talk; if it is not yours, a pointer would be great.',
    ],
    notes: [
      { at: 1, text: 'It read their actual page' },
      { at: 2, text: 'The work is in the email. Nothing to verify.' },
      { at: 3, text: 'The ask comes after the value' },
    ],
  },
};

function Mail({ sample }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-line bg-white shadow-[0_30px_70px_-42px_rgba(16,16,16,0.45)]">
      <div className="flex items-center gap-2 border-b border-stone-line bg-[#FBFAF9] px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E0DC]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E0DC]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E0DC]" />
        <p className="ml-3 truncate text-[12.5px] text-secondary-dark">From your inbox · not ours</p>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-[15.5px] font-semibold tracking-[-0.01em]">{sample.subject}</p>
        <div className="mt-5 space-y-4">
          {sample.lines.map((line, i) => {
            const note = sample.notes.find((n) => n.at === i);
            return (
              <div key={line.slice(0, 24)} className="sm:flex sm:items-start sm:gap-5">
                <p className="whitespace-pre-line text-[14.5px] leading-[1.75] text-[#44403C] sm:flex-1">
                  {line}
                </p>
                {note ? (
                  <p className="mt-1.5 shrink-0 text-[12px] leading-snug text-primary-dark sm:mt-1 sm:w-[168px]">
                    {note.text}
                  </p>
                ) : (
                  <span className="hidden sm:block sm:w-[168px]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EmailShowcase() {
  const [key, setKey] = useState('standard');
  const sample = SAMPLES[key];

  return (
    <Section id="email" tone="stone">
      <Reveal>
        <Eyebrow>What actually gets sent</Eyebrow>
        <Heading>Not an application. A reason to reply.</Heading>
        <Lead>
          Every competitor can show you a form being filled in. This is the thing that
          lands in someone&rsquo;s inbox with your name on it.
        </Lead>
      </Reveal>

      <Reveal delay={90}>
        <div className="mt-10 flex flex-wrap gap-2">
          {Object.entries(SAMPLES).map(([k, s]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKey(k)}
              aria-pressed={key === k}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-all ${
                key === k
                  ? 'bg-ink text-white'
                  : 'border border-stone-line bg-white text-[#57534E] hover:border-ink/25'
              }`}
            >
              {s.tab}
              {s.badge ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                    key === k ? 'bg-white/15 text-white' : 'bg-[#FFF0EB] text-primary-dark'
                  }`}
                >
                  {s.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={130} className="mt-6">
        <Mail sample={sample} />
      </Reveal>

      <Reveal delay={170}>
        <p className="mt-6 max-w-[70ch] text-[13.5px] leading-relaxed text-secondary-dark">
          {key === 'niche' ? (
            <>
              <span className="font-semibold text-primary-dark">In build.</span> Reading the
              prospect&rsquo;s live page and drafting the rewrite is the next thing we ship.
              Today ApplyDir writes the introduction above it.
            </>
          ) : (
            <>
              Illustrative example. In a real send, every number is checked against your CV
              before it leaves &mdash; if the source is not there, the claim does not go out.
            </>
          )}
        </p>
      </Reveal>
    </Section>
  );
}
