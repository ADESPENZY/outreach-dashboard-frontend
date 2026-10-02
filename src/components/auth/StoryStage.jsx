import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { captionSwap, storyCard, storyFade, threadDraw } from './authMotion';

/** Small status dot: orange (in progress) or green (done). */
export const Dot = ({ tone = 'orange', className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'h-2 w-2 shrink-0 rounded-full',
      tone === 'orange' ? 'bg-primary-light' : 'bg-emerald-500',
      className,
    )}
  />
);

/**
 * One card on the story thread: a 12px dot to its left, and the segment down
 * to the next card's dot, drawn once that next card is in. Rows sit 16px apart.
 */
export function ThreadRow({ shown, drawNext, last = false, children }) {
  return (
    <div className="relative pl-8">
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={storyFade}
        className="absolute left-0 top-[22px] h-3 w-3 rounded-full bg-primary-light"
      />
      {!last && (
        // From under this dot (34px) to the top of the next one: the row's
        // height plus the 16px gap plus the next dot's 22px offset, minus 34.
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ scaleY: drawNext ? 1 : 0 }}
          transition={threadDraw}
          style={{ originY: 0 }}
          className="absolute left-[5px] top-[34px] h-[calc(100%+4px)] w-0.5 bg-primary-light"
        />
      )}
      <motion.div initial={false} variants={storyCard} animate={shown ? 'in' : 'out'}>
        {children}
      </motion.div>
    </div>
  );
}

/**
 * A caption that crossfades when `index` changes. Both captions share one grid
 * cell, so the old one fades while the new one rises in the same place.
 * `initial={false}`: the first paint is the finished frame, not an entrance.
 */
export function StoryCaption({ captions, index, className, minHeightClass }) {
  return (
    <div className={cn('grid', minHeightClass)}>
      <AnimatePresence initial={false}>
        <motion.p
          key={index}
          {...captionSwap}
          className={cn('col-start-1 row-start-1 font-bold text-white', className)}
        >
          {captions[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/**
 * The desktop story frame: eyebrow, caption, the scene, progress segments.
 * Fills the story panel's content box; the scene takes the space between.
 */
export default function StoryStage({ eyebrow, captions, captionIndex, phase, children }) {
  return (
    <div data-story-phase={phase} className="flex h-full flex-col">
      <p className="text-xs uppercase tracking-[0.14em] text-white/60">{eyebrow}</p>

      <StoryCaption
        captions={captions}
        index={captionIndex}
        minHeightClass="mt-4 min-h-[90px] max-w-[540px]"
        className="text-[42px] leading-[1.06] tracking-[-0.03em]"
      />

      <div className="mt-7 min-h-0 flex-1">{children}</div>

      <div aria-hidden="true" className="mt-6 flex items-center gap-2">
        {captions.map((caption, i) => (
          <motion.span
            key={caption}
            initial={false}
            animate={{ width: i === captionIndex ? 30 : 8 }}
            transition={storyFade}
            className={cn(
              'h-1.5 rounded-full transition-colors duration-500',
              i === captionIndex ? 'bg-primary-light' : 'bg-white/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}
