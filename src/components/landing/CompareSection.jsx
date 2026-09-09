import { Section, Eyebrow, Heading, Lead, Reveal } from './primitives';

const ROWS = [
  { label: 'What they do', them: 'Mass-fill application forms into ATSs', us: 'Email the person who owns the hire' },
  { label: 'The output', them: 'One more résumé in the pile', us: 'A personal introduction in someone’s inbox' },
  { label: 'The bet', them: 'Volume — apply to more, faster', us: 'Quality — reach the person who decides' },
  { label: 'The result', them: 'The black hole, faster', us: 'A reply, a conversation, the hidden job market' },
];

export default function CompareSection() {
  return (
    <Section id="why" tone="ink">
      <Reveal>
        <Eyebrow tone="ink">Why not auto-apply</Eyebrow>
        <Heading>They help you apply faster. We help you skip the line.</Heading>
        <Lead tone="ink">
          The tools that fill in application forms automated the wrong thing. Filling the
          form was never the hard part — being the person whose name gets said out loud
          is. A headhunter does not submit your application faster. They know who is
          hiring, they know who decides, and they put your name in front of that person
          with a reason to care.
        </Lead>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-[22%] py-4 pr-6 text-[12.5px] font-semibold text-white/40">&nbsp;</th>
                <th className="w-[39%] py-4 pr-6 text-[12.5px] font-semibold text-white/40">
                  Auto-appliers
                </th>
                <th className="w-[39%] py-4 text-[12.5px] font-semibold text-primary-light">ApplyDir</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-white/10 align-top last:border-b-0">
                  <td className="py-5 pr-6 text-[13.5px] text-white/40">{r.label}</td>
                  <td className="py-5 pr-6 text-[15px] leading-snug text-white/55">{r.them}</td>
                  <td className="py-5 text-[15px] font-medium leading-snug text-white">{r.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <p className="mt-10 max-w-[62ch] text-[14.5px] leading-relaxed text-white/50">
          Auto-apply is a race to the bottom: commoditised, low-response, increasingly
          detected. ApplyDir plays a tier above — the way strong operators actually land
          roles, with a warm, relevant message to the person who decides.
        </p>
      </Reveal>
    </Section>
  );
}
