import { Section, Eyebrow, Heading, Lead, Reveal } from './primitives';

const STEPS = [
  {
    n: '01',
    title: 'Upload your CV',
    body: 'That is the entire setup. It reads your experience, works out what you are actually strong at, and builds your search from it.',
  },
  {
    n: '02',
    title: 'It searches every morning',
    body: 'New roles, the company behind each one, and the person who owns the hire. No buttons, no daily grind. You wake up to a queue.',
  },
  {
    n: '03',
    title: 'You approve introductions',
    body: 'Each one is drafted and waiting. Read it, change a line if you want, approve. It sends from your own inbox, spaced like a person sends.',
  },
];

export default function HowItWorks() {
  return (
    <Section id="how" tone="paper">
      <Reveal>
        <Eyebrow>How it works</Eyebrow>
        <Heading>You do three things. It does the rest.</Heading>
        <Lead>
          A real headhunter knows who is hiring, knows the decision-maker, and puts your
          name in front of them. ApplyDir does that on a schedule, and hands you the
          only step that needs a human.
        </Lead>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-stone-line bg-stone-line sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 90}>
            <div className="h-full bg-white p-7 sm:p-8">
              <p className="font-mono text-[12.5px] text-primary-light">{s.n}</p>
              <h3 className="mt-5 text-[19px] font-bold tracking-[-0.02em]">{s.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[#57534E]">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
