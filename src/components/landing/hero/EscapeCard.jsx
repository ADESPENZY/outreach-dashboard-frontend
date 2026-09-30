/**
 * The one CV that gets out — and what it turns into on the way.
 *
 * Purely presentational now. It used to own its own reveal; the hero's flight
 * loop drives every part of it through the `data-*` hooks below, because the
 * card, the trail behind it and the inbox it lands in all have to move on one
 * timeline.
 *
 * Two faces share a single grid cell so the crossfade at mid-flight is pure
 * opacity and the box never changes size:
 *   data-face-cv     the résumé it starts as
 *   data-face-email  the introduction it becomes
 *
 * Decorative — aria-hidden, no text a screen reader needs.
 */

const Send = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M4 12.5l15.5-7-6 15-2.2-6.3L4 12.5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export default function EscapeCard({ attach }) {
  return (
    <div
      ref={attach}
      data-card=""
      aria-hidden="true"
      className="relative h-[104px] w-[160px] rounded-2xl border-2 border-white/25 bg-white p-3.5 sm:h-[128px] sm:w-[200px] sm:p-4"
    >
      {/* Ignition: the orange border and bloom ride in on opacity so the grey
          "one of the crowd" state and the lit state are the same box. */}
      <span
        data-ignite=""
        style={{ opacity: 0 }}
        className="pointer-events-none absolute -inset-px rounded-2xl border-2 border-primary-light"
      />
      <span
        data-glow=""
        style={{ opacity: 0, boxShadow: '0 0 34px 2px rgba(255, 91, 46, 0.55)' }}
        className="pointer-events-none absolute -inset-px rounded-2xl"
      />

      <span className="absolute right-3 top-3 block h-1.5 w-1.5 rounded-full bg-primary-light sm:right-3.5 sm:top-3.5" />

      {/* Label — two stacked strings, crossfaded at the transformation. */}
      <span className="grid">
        <span
          data-label-cv=""
          style={{ opacity: 0 }}
          className="col-start-1 row-start-1 text-xs font-semibold text-ink"
        >
          Your CV
        </span>
        <span
          data-label-email=""
          style={{ opacity: 0 }}
          className="col-start-1 row-start-1 whitespace-nowrap text-xs font-semibold text-ink"
        >
          Your introduction
        </span>
      </span>

      <span className="mt-3 grid sm:mt-4">
        <span data-face-cv="" className="col-start-1 row-start-1 block space-y-2 sm:space-y-2.5">
          <span className="block h-1.5 w-full rounded-full bg-stone-line" />
          <span className="block h-1.5 w-[86%] rounded-full bg-stone" />
          <span className="block h-1.5 w-[58%] rounded-full bg-stone-line" />
        </span>

        <span
          data-face-email=""
          style={{ opacity: 0 }}
          className="col-start-1 row-start-1 block"
        >
          {/* Subject line sits heavier than the body, the way a real one reads. */}
          <span className="block h-2 w-[72%] rounded-full bg-[#C9C3BD]" />
          <span className="mt-2.5 block space-y-1.5 sm:mt-3">
            <span className="block h-1.5 w-full rounded-full bg-stone" />
            <span className="block h-1.5 w-[64%] rounded-full bg-stone" />
          </span>
          <Send className="mt-2 h-3.5 w-3.5 text-primary-light sm:mt-2.5" />
        </span>
      </span>
    </div>
  );
}
