/**
 * Beat 3's org chart: five silhouettes in a shallow tree, with a scan line that
 * sweeps across and stops on the one that matters.
 *
 * Drawn rather than illustrated so it restyles with the brand tokens and weighs
 * nothing. The section drives it through the `data-o` hooks.
 */

const NODES = [
  { x: 50, y: 14 },                    // top of the tree
  { x: 20, y: 62 }, { x: 40, y: 62 }, { x: 60, y: 62 }, { x: 80, y: 62 },
];

/** The one the scan settles on — third silhouette, per the beat. */
const TARGET = 3;

export default function OrgScan({ className = '' }) {
  return (
    <div data-o="root" className={`relative ${className}`} aria-hidden="true">
      {/* Connectors, behind the nodes. */}
      <svg
        viewBox="0 0 100 76"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {NODES.slice(1).map((n) => (
          <path
            key={n.x}
            d={`M 50 22 C 50 44, ${n.x} 40, ${n.x} 54`}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="relative h-full w-full">
        {NODES.map((n, i) => (
          <span
            key={`${n.x}-${n.y}`}
            data-o={i === TARGET ? 'target' : 'node'}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            className="absolute block h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/[0.07]"
          >
            {/* A head-and-shoulders mark, so these read as people not dots. */}
            <svg viewBox="0 0 24 24" className="h-full w-full p-1 text-white/35">
              <circle cx="12" cy="9" r="3.4" fill="currentColor" />
              <path
                d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {/* "Lights up" as an opacity tween on an overlay, so no colour
                property has to animate. */}
            {i === TARGET && (
              <span
                data-o="glow"
                style={{ opacity: 0 }}
                className="absolute -inset-0.5 rounded-full bg-primary-light/25 ring-2 ring-primary-light"
              />
            )}
          </span>
        ))}

        {/* The sweep. Positioned by the timeline, not by CSS animation. */}
        <span
          data-o="scan"
          className="absolute inset-y-0 left-0 block w-px bg-primary-light"
          style={{ boxShadow: '0 0 12px 2px rgba(255, 91, 46, 0.55)' }}
        />
      </div>
    </div>
  );
}
