import { Link } from 'react-router-dom';
import { Reveal, CtaButton } from './primitives';

/**
 * Product panel, drawn rather than screenshotted: it restyles with the brand
 * tokens, stays crisp on retina, weighs nothing, and never goes stale when the
 * real UI moves. The rows below mirror the Introductions review queue.
 */
const QUEUE = [
  { role: 'Content Marketing Manager', org: 'a developer-tools company', note: 'Head of Marketing · found this morning', live: true },
  { role: 'Senior Copywriter', org: 'a DTC skincare brand', note: 'Brand Lead · found this morning' },
  { role: 'Lifecycle Marketer', org: 'a fintech startup', note: 'VP Growth · found yesterday' },
];

function Panel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-line bg-white shadow-[0_30px_70px_-40px_rgba(16,16,16,0.4)]">
      <div className="flex items-center justify-between border-b border-stone-line px-5 py-4">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Introductions</p>
          <p className="mt-0.5 text-[12.5px] text-secondary-dark">Review, tweak a line, approve.</p>
        </div>
        <span className="rounded-full bg-[#FFF0EB] px-2.5 py-1 text-[11.5px] font-semibold text-primary-dark">
          3 waiting
        </span>
      </div>

      <div className="divide-y divide-stone-line">
        {QUEUE.map((row) => (
          <div key={row.role} className="flex items-start gap-3.5 px-5 py-4">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.live ? 'bg-primary-light' : 'bg-[#D6D1CC]'}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold tracking-[-0.01em]">{row.role}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-secondary-dark">
                {row.org} · {row.note}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                row.live ? 'bg-ink text-white' : 'border border-stone-line text-[#57534E]'
              }`}
            >
              {row.live ? 'Approve' : 'Review'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t border-stone-line bg-stone px-5 py-3.5">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-60" />
        </span>
        <p className="text-[12.5px] text-[#57534E]">
          Searching overnight. Nothing sends until you approve it.
        </p>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white px-5 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 pb-20 pt-10 sm:pb-24 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">
          <Reveal>
            <p className="mb-5 text-[13px] tracking-[0.02em] text-secondary-dark">Your AI headhunter</p>
            <h1 className="text-[clamp(2.05rem,5.4vw,3.2rem)] font-bold leading-[1.02] tracking-[-0.032em]">
              It finds who&rsquo;s hiring.
              <br />
              Then it introduces you.
            </h1>
          </Reveal>

          <Reveal delay={90}>
            <p className="mt-6 max-w-[54ch] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-relaxed text-[#3A3632]">
              ApplyDir finds roles that fit, works out who actually makes the hiring
              decision, and writes them a personal introduction &mdash; from your inbox,
              in your words. You review and approve. That&rsquo;s the whole job.
            </p>
          </Reveal>

          <Reveal delay={170}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary-light px-6 text-[15px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-dark hover:shadow-md"
              >
                Get introduced
              </Link>
              <CtaButton href="#email" tone="ghost">
                See what actually gets sent
              </CtaButton>
            </div>
            <p className="mt-4 text-[13px] text-secondary-dark">
              Free while we&rsquo;re in early access. No card.
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="min-w-0">
          <Panel />
        </Reveal>
      </div>
    </section>
  );
}
