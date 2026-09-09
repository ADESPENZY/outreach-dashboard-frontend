import { Section, Eyebrow, Heading, Lead, Reveal } from './primitives';

const FIELDS = [
  'Copywriting', 'Marketing', 'Engineering', 'Design', 'Nursing', 'Caregiving',
  'Healthcare admin', 'Sales', 'Customer success', 'Operations', 'Finance',
  'Education', 'Data', 'Product',
];

export default function AudienceSection() {
  return (
    <Section tone="stone">
      <div className="grid [&>*]:min-w-0 gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-20">
        <Reveal>
          <Eyebrow>Who it is for</Eyebrow>
          <Heading>Not just engineers.</Heading>
          <Lead>
            Most AI job tools only work if you write code. ApplyDir finds the
            decision-maker for the field you are actually in &mdash; a Director of Nursing
            for a ward role, a Head of Marketing for a content role, a founder at a
            twelve-person startup.
          </Lead>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-[#3A3632]">
            It was built for professionals looking for remote work globally, especially
            skilled people in places where the local market is far smaller than their
            ability &mdash; and who are tired of watching a résumé vanish into an ATS.
          </p>
        </Reveal>

        <Reveal delay={110}>
          <div className="flex flex-wrap content-start gap-2.5 lg:pt-16">
            {FIELDS.map((f) => (
              <span
                key={f}
                className="rounded-xl border border-stone-line bg-white px-4 py-2.5 text-[14px] font-medium text-[#44403C]"
              >
                {f}
              </span>
            ))}
            <span className="rounded-xl border border-dashed border-[#C9C3BD] px-4 py-2.5 text-[14px] text-secondary-dark">
              and more
            </span>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
