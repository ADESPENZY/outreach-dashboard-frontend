import { BEATS } from './journeyContent';

/**
 * Where you are in the six beats.
 *
 * Two pieces, both driven by the section's timeline through `data-rail-*`
 * hooks rather than by state, so they track a scrub exactly:
 *
 *   the line  fills continuously with timeline progress (a scale transform,
 *             so it composites)
 *   the dots  fill one at a time as each beat is reached
 *
 * Vertical under the counter on lg+, horizontal above the caption below it —
 * the same component, laid out twice, because the two orientations need
 * different scale axes and the markup is otherwise identical.
 */

const DOT = 'h-2 w-2 rounded-full';

export default function ProgressRail({ vertical = false }) {
  const axis = vertical ? 'v' : 'h';
  return (
    <div
      aria-hidden="true"
      className={
        vertical
          ? 'relative flex flex-col items-center gap-0'
          : 'relative flex items-center gap-0'
      }
    >
      {/* The track, and the part of it that has been travelled. */}
      <span
        className={`absolute bg-white/15 ${
          vertical ? 'left-1/2 top-1 h-[calc(100%-0.5rem)] w-px -translate-x-1/2' : 'left-1 top-1/2 h-px w-[calc(100%-0.5rem)] -translate-y-1/2'
        }`}
        data-rail-track={axis}
      >
        <span
          data-rail-fill={axis}
          style={{ transform: vertical ? 'scaleY(0)' : 'scaleX(0)' }}
          className={`block h-full w-full bg-primary-light ${vertical ? 'origin-top' : 'origin-left'}`}
        />
      </span>

      {BEATS.map((b, i) => (
        <span
          key={b.n}
          className={`relative ${vertical ? (i === 0 ? '' : 'mt-5') : (i === 0 ? '' : 'ml-5')}`}
        >
          <span data-rail-dot-bg={axis} className={`block ${DOT} bg-white/20`} />
          {/* Filled state as an overlay, so reaching a beat is an opacity
              tween and nothing has to animate a colour. */}
          <span
            data-rail-dot={`${axis}-${i}`}
            style={{ opacity: 0 }}
            className={`absolute inset-0 block ${DOT} bg-primary-light`}
          />
        </span>
      ))}
    </div>
  );
}
