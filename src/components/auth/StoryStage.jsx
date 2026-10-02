import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { captionSwap, storyFade } from './authMotion';

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
