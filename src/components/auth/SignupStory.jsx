import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import StoryStage, { Dot, ThreadRow } from './StoryStage';
import useStoryTimeline from './useStoryTimeline';
import { SIGNUP_STORY, signupCaptionIndex } from './storyContent';
import {
  TYPE_CHARS, TYPE_TICK_MS, approvePulse, checkPop, iconSwap, signupTimeline,
} from './authMotion';

/**
 * "The introduction gets written" (AUTH_DESIGN_GUIDE.md §5).
 *
 * The desktop scene for the story panel. The cards and the typing hook are
 * exported so the phone intro slides tell the same story with the same parts.
 */

const S = SIGNUP_STORY;
export const SIGNUP_TIMELINE = signupTimeline(S.intro.body.length);

const CARD = 'rounded-[18px] border bg-ink-soft p-4';

/**
 * Types `text` out, 2 characters every 36ms, while `active`. Resets to empty
 * when it goes inactive; clears its interval on change and unmount.
 */
export function useTypedText(text, active) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!active) return undefined;
    let n = 0;
    const id = setInterval(() => {
      n = Math.min(text.length, n + TYPE_CHARS);
      setCount(n);
      if (n >= text.length) clearInterval(id);
    }, TYPE_TICK_MS);
    return () => clearInterval(id);
  }, [text, active]);

  return text.slice(0, count);
}

export function RoleCard({ highlighted = false, className }) {
  return (
    <div className={cn(CARD, highlighted ? 'border-primary-light/45' : 'border-white/10', className)}>
      <p className="text-xs uppercase tracking-[0.14em] text-white/60">{S.role.eyebrow}</p>
      <p className="mt-1.5 text-[17px] font-semibold leading-snug text-white">{S.role.title}</p>
      <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
        <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary-light" strokeWidth={2.5} />
        {S.role.fit}
      </p>
    </div>
  );
}

export function PersonCard({ className }) {
  return (
    <div className={cn(CARD, 'flex items-center gap-3 border-white/10', className)}>
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-raised">
        <User className="h-5 w-5 text-white/60" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{S.person.name}</span>
        <span className="block text-[13px] text-white/60">{S.person.title}</span>
      </span>
      <span className="shrink-0 rounded-full border border-primary-light/50 px-2.5 py-1 text-xs text-primary-tint">
        {S.person.chip}
      </span>
    </div>
  );
}

/**
 * The introduction. `phase` 3 types the body, 4 shows the Approve pill, 5 the
 * sent status. The full body sits underneath in transparent text, so the card
 * never changes height while typing and screen readers get the whole message
 * rather than every keystroke.
 */
export function IntroCard({ phase, typed, className }) {
  const body = phase >= 4 ? S.intro.body : phase === 3 ? typed : '';
  const typing = phase === 3 && typed.length < S.intro.body.length;

  return (
    <div className={cn(CARD, 'border-white/10', className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-white/60">
        <span>{S.intro.to}</span>
        <span>{S.intro.from}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{S.intro.subject}</p>

      <div className="mt-2 grid text-sm leading-relaxed">
        <p className="col-start-1 row-start-1 text-transparent">{S.intro.body}</p>
        <p aria-hidden="true" className="col-start-1 row-start-1 text-white/80">
          {body}
          {typing && (
            <span className="ml-px inline-block h-[1.05em] w-0.5 translate-y-[0.15em] animate-[caret_1s_step-end_infinite] bg-primary-light" />
          )}
        </p>
      </div>

      <div className="mt-3 flex min-h-[32px] items-center justify-between gap-3 border-t border-white/10 pt-3">
        <span className="text-xs text-white/60">{S.intro.footer}</span>
        <AnimatePresence mode="wait" initial={false}>
          {phase === 4 && (
            <motion.span key="approve" {...checkPop} className="relative shrink-0">
              <motion.span
                aria-hidden="true"
                {...approvePulse}
                className="absolute inset-0 rounded-full border-2 border-primary-light"
              />
              <span className="relative inline-flex h-7 items-center rounded-full bg-primary-light px-3 text-xs font-semibold text-ink">
                {S.intro.approve}
              </span>
            </motion.span>
          )}
          {phase >= 5 && (
            <motion.span key="sent" {...iconSwap} className="flex shrink-0 items-center gap-2 text-xs text-white/80">
              <Dot tone="green" />{S.intro.sent}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SignupStory() {
  const reduced = useReducedMotion();
  const phase = useStoryTimeline(SIGNUP_TIMELINE, { enabled: !reduced });
  const typed = useTypedText(S.intro.body, phase === 3);

  return (
    <StoryStage
      eyebrow={S.eyebrow}
      captions={S.captions}
      captionIndex={signupCaptionIndex(phase)}
      phase={phase}
    >
      <div className="flex max-w-[440px] flex-col gap-4">
        <ThreadRow shown={phase >= 1} drawNext={phase >= 2}>
          <RoleCard />
        </ThreadRow>
        <ThreadRow shown={phase >= 2} drawNext={phase >= 3}>
          <PersonCard />
        </ThreadRow>
        <ThreadRow shown={phase >= 3} last>
          <IntroCard phase={phase} typed={typed} />
        </ThreadRow>
      </div>
    </StoryStage>
  );
}
