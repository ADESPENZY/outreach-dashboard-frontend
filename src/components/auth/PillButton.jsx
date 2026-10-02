import { forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  FOCUS_RING, checkPop, iconSwap, pillButtonVariants, pillCircleVariants,
} from './authMotion';

/**
 * The primary action on the auth pages.
 *
 * Not the shadcn Button: its defaults pull shadcn's near-black primary. Text on
 * orange is ink, not white (white on primary-light is ~3:1 and fails AA here).
 *
 * `status`: idle → arrow; busy → spinner, clicks ignored; done → check.
 * Busy and done use aria-disabled rather than `disabled` so focus stays put,
 * and the click (including Enter's implicit submit) is swallowed here.
 */
const PillButton = forwardRef(function PillButton(
  { status = 'idle', doneLabel, children, type = 'submit', onClick, className, ...rest },
  ref,
) {
  const inactive = status !== 'idle';

  const handleClick = (e) => {
    if (inactive) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={handleClick}
      aria-disabled={inactive || undefined}
      aria-busy={status === 'busy' || undefined}
      variants={pillButtonVariants}
      initial="rest"
      animate="rest"
      whileHover={inactive ? undefined : 'hover'}
      whileTap={inactive ? undefined : 'press'}
      className={cn(
        'relative h-[54px] w-full rounded-full bg-primary-light px-16 text-base font-semibold text-ink lg:h-14',
        FOCUS_RING,
        inactive && 'cursor-default',
        className,
      )}
      {...rest}
    >
      <span aria-live="polite">{status === 'done' && doneLabel ? doneLabel : children}</span>

      <span aria-hidden="true" className="absolute inset-y-0 right-2 flex items-center">
        <motion.span
          variants={pillCircleVariants}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white"
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === 'busy' && (
              <motion.span key="busy" {...iconSwap} className="flex">
                <span className="block h-4 w-4 animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-white/30 border-t-white" />
              </motion.span>
            )}
            {status === 'done' && (
              <motion.span key="done" {...checkPop} className="flex">
                <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
              </motion.span>
            )}
            {status === 'idle' && (
              <motion.span key="idle" {...iconSwap} className="flex">
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
      </span>
    </motion.button>
  );
});

export default PillButton;
