import { Section, Eyebrow, Heading, Lead, Reveal } from './primitives';

const RULES = [
  { title: 'You approve every message', body: 'Nothing sends on its own. Each introduction waits in a queue until you read it and say yes.' },
  { title: 'One introduction per company', body: 'Ever. No second attempt at the same company from a different angle, no drip sequence into the same building.' },
  { title: 'A named person, never a role inbox', body: 'careers@, info@ and hr@ are skipped on purpose. If we cannot find a real human, the role is routed aside instead.' },
  { title: 'Paced like a person sends', body: 'A small daily ceiling, minutes between sends, and a warm-up period on new mailboxes. Your deliverability is the asset.' },
  { title: 'Your inbox, your domain', body: 'It sends from the mailbox you connect. No shared pool, no relay, nothing that marks the message as bulk.' },
  { title: 'An easy way out, every time', body: 'Every email offers a graceful no. Anyone who asks is suppressed immediately and permanently.' },
];

export default function TrustSection() {
  return (
    <Section tone="paper">
      <Reveal>
        <Eyebrow>Is this spam?</Eyebrow>
        <Heading>No. And here is exactly why.</Heading>
        <Lead>
          Cold outreach earns its reputation when it is done at volume, without care,
          from a pool of burner domains. Every rule below exists to make this the
          opposite of that &mdash; and to keep the mailbox you rely on healthy.
        </Lead>
      </Reveal>

      <div className="mt-14 grid gap-x-12 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {RULES.map((r, i) => (
          <Reveal key={r.title} delay={(i % 3) * 80}>
            <div className="border-t border-stone-line pt-5">
              <h3 className="text-[16.5px] font-bold tracking-[-0.015em]">{r.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#57534E]">{r.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
