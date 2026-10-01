/**
 * The hiring manager's inbox — the place the CV is actually going.
 *
 * It is the counterweight to the vortex: the void eats everything thrown into
 * it, and this is the one destination that isn't the void. Decorative, so it is
 * aria-hidden; the headline and sub already say all of this in real text.
 *
 * Positioned by HeroVoid from the same getCenter the canvas draws with, handed
 * down as `left`/`top` props — it never measures its own parent.
 */

const Avatar = () => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-line">
    <svg viewBox="0 0 24 24" className="h-full w-full text-[#A8A29E]" aria-hidden="true">
      <circle cx="12" cy="9.5" r="3.6" fill="currentColor" />
      <path
        d="M4.8 20.5c0-3.8 3.2-6.3 7.2-6.3s7.2 2.5 7.2 6.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

/**
 * The node reads as lit from the start — it is the counterweight to the void,
 * not a dormant box that only wakes up on arrival. The pulse overlay just
 * raises this briefly when the introduction lands.
 */
const RESTING_GLOW =
  '0 0 0 1px rgba(255, 91, 46, 0.15), 0 0 40px -6px rgba(255, 91, 46, 0.35)';

/**
 * The arrival flare. It rides on the pulse overlay rather than on the node
 * itself, so the hero timeline only has to fade one element in and out and
 * the glow rises to ~0.6 and settles back on its own.
 */
const ARRIVAL_GLOW =
  '0 0 0 1px rgba(255, 91, 46, 0.45), 0 0 56px -4px rgba(255, 91, 46, 0.6)';

export default function InboxNode({ attach, left, top, reduced }) {
  return (
    <div
      ref={attach}
      data-inbox=""
      aria-hidden="true"
      style={{ left: `${left}px`, top: `${top}px`, boxShadow: RESTING_GLOW }}
      className="pointer-events-none absolute z-20 w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary-light/35 bg-white/[0.04] p-3 backdrop-blur-md lg:w-[220px] lg:p-4"
    >
      {/* The border pulse on arrival is an overlay, so only opacity animates. */}
      <span
        data-inbox-pulse=""
        style={{ opacity: 0, boxShadow: ARRIVAL_GLOW }}
        className="pointer-events-none absolute -inset-px rounded-2xl ring-2 ring-primary-light"
      />

      <div className="flex items-center gap-2.5">
        <Avatar />
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-semibold text-white/85 lg:text-[13px]">
            Hiring manager
          </span>
          <span className="block text-[11px] text-white/45">Inbox</span>
        </span>
      </div>

      {/* The message slot. Empty until the introduction lands in it. */}
      <div className="mt-2.5 min-h-[34px] space-y-1.5 border-t border-white/10 pt-2.5 lg:mt-3 lg:pt-3">
        <p
          data-inbox-new=""
          style={reduced ? undefined : { opacity: 0 }}
          className="flex items-center gap-1.5 text-[11px] text-white/70 lg:text-[12px]"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-light" />
          <span className="truncate">New introduction from you</span>
        </p>
        <p
          data-inbox-delivered=""
          style={reduced ? undefined : { opacity: 0 }}
          className="flex items-center gap-1.5 text-[11px] text-white/55 lg:text-[12px]"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate">Delivered</span>
        </p>
      </div>
    </div>
  );
}
