import { ACTIONS, CONTACT, EMAIL, FOLLOW_UPS, ILLUSTRATIVE, JOB, REPLY, STAGES } from './journeyContent';

/**
 * The one card that lives through all six beats.
 *
 * A rebuild of the real Opportunities card and Introductions reply panel, not
 * an import of them: the landing folder stays self-contained, so nothing here
 * drags product code into the entry bundle. The classes mirror the app's
 * (rounded-2xl on neutral-dark, emerald match pill, orange gradient CTA,
 * emerald reply block) so the page shows the product people will actually get.
 *
 * Two modes:
 *   beat == null → every state rendered, `data-j` hooked, driven by the section's
 *                  timeline. The four body views share one grid cell, so the
 *                  card's height is the tallest of them and crossfading between
 *                  them never reflows.
 *   beat == 1..6 → the reduced-motion path: just that beat, in its final form.
 */

const Tick = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M8.5 12.3l2.4 2.4 4.6-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Pin = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const Popper = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M3 21l5.2-11.4L15 16.4 3 21z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14.5 9.5l1-2.2M17.8 12l2.2-1M13 6l-.6-2.4M18.5 7.5l1.8-1.8M20 16.5l1.6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Arrow = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M5 12h13M13 6.5l5.5 5.5L13 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Every stage label the scene passes through, in order. */
const STAGE_LABELS = ['New', 'Contact found', 'Replied'];

/**
 * Stage bar — the app's "Stage / label" row with the orange progress fill.
 * Animated, the three labels are stacked in one grid cell and crossfaded, so
 * the label change is an opacity tween rather than a text swap mid-scrub.
 */
function Stage({ anim, label, pct }) {
  return (
    <div data-j="stage" className="pb-3">
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-secondary-dark/60">Stage</span>
        {anim ? (
          <span className="grid">
            {STAGE_LABELS.map((l, i) => (
              <span
                key={l}
                data-j={`stage-label-${i + 1}`}
                className="col-start-1 row-start-1 justify-self-end whitespace-nowrap font-medium text-secondary-dark"
                style={{ opacity: i === 0 ? 1 : 0 }}
              >
                {l}
              </span>
            ))}
          </span>
        ) : (
          <span className="font-medium text-secondary-dark">{label}</span>
        )}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral">
        {/* scaleX, not width — the fill is a transform so it composites. */}
        <div
          data-j="stage-fill"
          className="h-full w-full origin-left rounded-full bg-primary-light"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}

export default function JourneyCard({ beat = null, attach, className = '' }) {
  const anim = beat == null;
  const on = (...bs) => anim || bs.includes(beat);
  const stage = anim ? STAGES.beat1 : (STAGES[`beat${beat}`] ?? null);

  return (
    <div
      ref={attach}
      data-j="card"
      className={`relative overflow-hidden rounded-2xl border border-neutral-dark bg-white p-5 shadow-sm ${className}`}
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-emerald-400/30" />

      <span
        data-j="pill"
        className="absolute right-4 top-4 rounded-full bg-stone px-2 py-0.5 text-[10px] font-medium text-secondary-dark"
      >
        {ILLUSTRATIVE}
      </span>

      {/* Identity row — the one constant across every beat. */}
      <div className="flex items-center gap-2 pr-24">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-[10px] font-bold text-white">
          {JOB.initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-secondary-dark">
          {JOB.company}
        </span>
      </div>

      {/* All four body views share one grid cell: the card is as tall as the
          tallest of them, so swapping views is pure opacity. */}
      <div className="mt-1.5 grid">
        {on(1, 2, 3) && (
          <div data-j="jobview" className="col-start-1 row-start-1">
            <h3 className="font-montserrat text-base font-bold leading-snug text-black-light">
              {JOB.role}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-secondary-dark">
              <Pin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{JOB.location}</span>
            </p>
            <div className="mt-2.5">
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">
                {JOB.match}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-secondary-dark">{JOB.reason}</p>

            {on(3) && (
              <p data-j="contact" className="mt-2.5 flex items-center gap-1.5 text-xs text-secondary-dark">
                <Tick className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="truncate">
                  <span className="font-semibold text-black-light">{CONTACT.name}</span>
                  <span>, {CONTACT.title}</span>
                </span>
              </p>
            )}
          </div>
        )}

        {on(4) && (
          <div data-j="emailview" className="col-start-1 row-start-1">
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-black-light">
              {EMAIL.subject}
            </p>
            <div className="mt-3 space-y-2">
              {[EMAIL.lines[0], EMAIL.lines[1]].map((line, i) => (
                <p
                  key={line}
                  data-j={`eline-${i + 1}`}
                  className="text-xs leading-relaxed text-secondary-dark"
                >
                  {line}
                  <span data-j={`caret-${i + 1}`} className="ml-0.5 inline-block h-3 w-px translate-y-[2px] bg-primary-light align-baseline animate-caret" />
                </p>
              ))}
              <p data-j="eline-3" className="text-xs leading-relaxed text-secondary-dark">
                {EMAIL.line3.before}
                {anim ? (
                  /* Both words occupy the same inline box, so the swap is a
                     crossfade rather than a reflow mid-sentence. */
                  <span data-j="wordswap" className="relative inline-grid align-baseline">
                    <span data-j="word-before" className="col-start-1 row-start-1 whitespace-pre">
                      {EMAIL.line3.wordBefore}
                    </span>
                    <span
                      data-j="word-after"
                      className="col-start-1 row-start-1 whitespace-pre font-semibold text-black-light"
                      style={{ opacity: 0 }}
                    >
                      {EMAIL.line3.wordAfter}
                    </span>
                  </span>
                ) : (
                  /* Static beat 4 is the email *after* the edit, so only the
                     replacement word is rendered — stacking both here would
                     print them on top of each other. */
                  <span className="font-semibold text-black-light">{EMAIL.line3.wordAfter}</span>
                )}
                {EMAIL.line3.after}
                <span data-j="caret-3" className="ml-0.5 inline-block h-3 w-px translate-y-[2px] bg-primary-light align-baseline animate-caret" />
              </p>
            </div>
          </div>
        )}

        {on(5) && (
          <div data-j="followups" className="col-start-1 row-start-1 py-2">
            <div className="relative mt-2 flex items-center justify-between">
              <span className="absolute inset-x-0 top-[5px] h-px bg-neutral-dark" />
              {FOLLOW_UPS.dots.map((d, i) => (
                <span key={d} className="relative flex flex-col items-center gap-2">
                  <span
                    data-j={`fdot-${i + 1}`}
                    className="block h-2.5 w-2.5 rounded-full bg-primary-light"
                  />
                  <span className="text-[11px] text-secondary-dark">{d}</span>
                </span>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-secondary-dark">{FOLLOW_UPS.note}</p>
          </div>
        )}

        {on(6) && (
          <div
            data-j="reply"
            className="col-start-1 row-start-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <Popper className="h-4 w-4 shrink-0" />
              {REPLY.heading}
            </p>
            <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-widest text-emerald-700/70">
              Their reply
            </p>
            <p className="text-sm leading-relaxed text-emerald-900/90">{REPLY.body}</p>
          </div>
        )}
      </div>

      {/* Stage + actions. Beat 5 is the only one with neither. */}
      <div className="mt-auto pt-4">
        {stage && on(1, 2, 3, 4, 6) && <Stage anim={anim} label={stage.label} pct={stage.pct} />}

        {/* Both action rows share one grid cell: only one is ever visible, and
            stacking them means the hidden one is not still reserving height. */}
        <div className="grid">
        {on(1, 2) && (
          <div data-j="buttons" className="col-start-1 row-start-1 flex items-center gap-2">
            <span className="shrink-0 rounded-xl px-3 py-2.5 font-semibold text-secondary-dark">
              {ACTIONS.skip}
            </span>
            <span
              data-j="reachout"
              className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-light to-primary-dark px-4 py-2.5 font-semibold text-white shadow-sm"
            >
              {ACTIONS.reachOut}
              <Arrow className="h-4 w-4 shrink-0" />
              {/* The tap's ring flash — an overlay so it is an opacity tween,
                  not an animated box-shadow. */}
              {anim && (
                <span
                  data-j="ring"
                  style={{ opacity: 0 }}
                  className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-primary-light"
                />
              )}
            </span>
          </div>
        )}

        {on(4) && (
          <div
            data-j="approve"
            className="col-start-1 row-start-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-light to-primary-dark px-4 py-2.5 font-semibold text-white shadow-sm"
          >
            {ACTIONS.approve}
          </div>
        )}
        </div>
      </div>

    </div>
  );
}
