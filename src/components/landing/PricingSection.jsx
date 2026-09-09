import { Link } from 'react-router-dom';
import { Section, Eyebrow, Heading, Lead, Reveal } from './primitives';

/**
 * Placeholder pricing. Numbers are indicative and flagged as such on the page —
 * the model has not been decided. Swapping them is a one-file edit.
 */
const TIERS = [
  {
    name: 'Starter',
    price: '$0',
    cadence: 'while in early access',
    line: 'Everything below, no card, no trial clock.',
    points: ['One connected inbox', 'Daily search and scoring', 'Introductions drafted for you', 'You approve every send'],
    cta: 'Get started',
    tone: 'ghost',
  },
  {
    name: 'Standard',
    price: '$29',
    cadence: 'per month',
    line: 'For an active search you want to finish.',
    points: ['A larger daily send budget', 'Follow-ups written and timed', 'Tailored CV per role', 'Reply detection and routing'],
    cta: 'Get started',
    tone: 'orange',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$59',
    cadence: 'per month',
    line: 'Two mailboxes and the deeper research pass.',
    points: ['Two connected inboxes', 'Deeper research per contact', 'Inbox warm-up pool', 'Priority support from a human'],
    cta: 'Get started',
    tone: 'ghost',
  },
];

export default function PricingSection() {
  return (
    <Section id="pricing" tone="stone">
      <Reveal>
        <Eyebrow>Pricing</Eyebrow>
        <Heading>Free while we are in early access.</Heading>
        <Lead>
          The paid tiers below are a placeholder while we work out what is fair. Nothing
          is charged today, and anyone who joins during early access keeps that for the
          whole of their search.
        </Lead>
      </Reveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 90}>
            <div
              className={`flex h-full flex-col rounded-2xl border p-7 sm:p-8 ${
                t.featured ? 'border-ink bg-ink text-white' : 'border-stone-line bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-[14px] font-semibold ${t.featured ? 'text-white/60' : 'text-secondary-dark'}`}>
                  {t.name}
                </p>
                {t.featured ? (
                  <span className="rounded-full bg-primary-light px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">
                    Indicative
                  </span>
                ) : null}
              </div>

              <p className="mt-5 text-[40px] font-bold leading-none tracking-[-0.035em]">{t.price}</p>
              <p className={`mt-2 text-[13.5px] ${t.featured ? 'text-white/50' : 'text-secondary-dark'}`}>
                {t.cadence}
              </p>
              <p className={`mt-5 text-[14.5px] leading-relaxed ${t.featured ? 'text-white/70' : 'text-[#57534E]'}`}>
                {t.line}
              </p>

              <ul className="mt-7 flex-1 space-y-3">
                {t.points.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span
                      className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                        t.featured ? 'bg-primary-light' : 'bg-[#D6D1CC]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className={`text-[14.5px] leading-snug ${t.featured ? 'text-white/80' : 'text-[#44403C]'}`}>
                      {p}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-semibold transition-all duration-200 ${
                  t.tone === 'orange'
                    ? 'bg-primary-light text-white hover:bg-primary-dark'
                    : t.featured
                      ? 'border border-white/25 text-white hover:bg-white/10'
                      : 'border border-stone-line text-ink hover:border-ink/30 hover:bg-stone'
                }`}
              >
                {t.cta}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={140}>
        <p className="mt-8 text-[13px] text-secondary-dark">
          Prices shown are placeholders and are not being charged.
        </p>
      </Reveal>
    </Section>
  );
}
