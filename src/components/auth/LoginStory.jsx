import { motion, useReducedMotion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';
import StoryStage, { StoryCaption } from './StoryStage';
import useStoryTimeline from './useStoryTimeline';
import { LOGIN_STORY, loginCaptionIndex } from './storyContent';
import {
  LOGIN_TIMELINE, storyCard, storyFade, threadDraw, timelineFill,
} from './authMotion';

/**
 * "The reply comes back" (AUTH_DESIGN_GUIDE.md §4).
 *
 * LoginStory is the desktop scene inside the story panel; LoginStoryCompact is
 * the phone card above the h1. Each runs its own timeline, and both hold the
 * finished frame (phase 5) under reduced motion.
 */

const S = LOGIN_STORY;

const Dot = ({ tone = 'orange', className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'h-2 w-2 shrink-0 rounded-full',
      tone === 'orange' ? 'bg-primary-light' : 'bg-emerald-500',
      className,
    )}
  />
);

/** Sent / Day 3 / Day 7 / Day 14, with a 2px track and the orange fill. */
function FollowUpTimeline({ phase, compact = false }) {
  const lit = (i) => i === 0 || (i === 1 && phase >= 3) || (i === 2 && phase >= 4);
  const fill = phase >= 4 ? 2 / 3 : phase >= 3 ? 1 / 3 : 0;
  const cancelled = phase >= 5;

  return (
    <div className="relative">
      {/* Track runs dot centre to dot centre: 12.5% in from each side of a 4-col grid. */}
      <div aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-[5px] h-0.5 bg-white/10">
        <motion.div
          initial={false}
          animate={{ scaleX: fill }}
          transition={timelineFill}
          style={{ originX: 0 }}
          className="h-full bg-primary-light"
        />
      </div>

      <ol className="relative grid grid-cols-4">
        {S.timeline.map((step, i) => {
          const isCancelled = i === 3 && cancelled;
          return (
            <li key={step.label} className="flex flex-col items-center text-center">
              <span
                aria-hidden="true"
                className={cn(
                  'h-3 w-3 rounded-full transition-colors duration-500',
                  lit(i) ? 'bg-primary-light' : 'bg-ink-mute',
                )}
              />
              <span
                className={cn(
                  'mt-2 text-[13px] font-semibold transition-colors duration-500',
                  isCancelled ? 'text-white/60 line-through' : 'text-white',
                )}
              >
                {step.label}
              </span>
              {!compact && (
                <span className="mt-0.5 text-xs text-white/60">
                  {isCancelled ? S.cancelled : step.sub}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * One card on the thread: a 12px dot to its left, and the segment down to the
 * next card's dot, drawn once that next card is in.
 */
function ThreadRow({ shown, drawNext, last = false, children }) {
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

function InboxCard({ phase }) {
  return (
    <div className="rounded-[18px] border border-primary-light/45 bg-ink-soft p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-raised">
          <User className="h-[18px] w-[18px] text-white/60" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{S.inbox.name}</span>
          <span className="block text-[13px] text-white/60">{S.inbox.label}</span>
        </span>
      </div>
      <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm text-white/80">
        <p className="flex items-center gap-2"><Dot />{S.inbox.newIntro}</p>
        <motion.p
          initial={false}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={storyFade}
          className="flex items-center gap-2"
        >
          <Dot tone="green" />{S.inbox.delivered}
        </motion.p>
      </div>
    </div>
  );
}

function ReplyCard() {
  return (
    <div className="rounded-[18px] border border-white/10 bg-ink-soft p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/60">{S.reply.eyebrow}</p>
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white"><Dot />{S.reply.from}</p>
      <div aria-hidden="true" className="mt-3 space-y-2">
        {S.reply.bars.map((w) => (
          <span key={w} className="block h-1.5 rounded-full bg-white/10" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-sm text-white/80">
        <Dot tone="green" />{S.reply.stopped}
      </p>
    </div>
  );
}

function useLoginPhase() {
  const reduced = useReducedMotion();
  return useStoryTimeline(LOGIN_TIMELINE, { enabled: !reduced });
}

export default function LoginStory() {
  const phase = useLoginPhase();

  return (
    <StoryStage
      eyebrow={S.eyebrow}
      captions={S.captions}
      captionIndex={loginCaptionIndex(phase)}
      phase={phase}
    >
      <div className="flex max-w-[420px] flex-col gap-4">
        <ThreadRow shown={phase >= 1} drawNext={phase >= 3}>
          <InboxCard phase={phase} />
        </ThreadRow>
        <ThreadRow shown={phase >= 3} drawNext={phase >= 5}>
          <div className="rounded-[18px] border border-white/10 bg-ink-soft px-3 py-4">
            <FollowUpTimeline phase={phase} />
          </div>
        </ThreadRow>
        <ThreadRow shown={phase >= 5} last>
          <ReplyCard />
        </ThreadRow>
      </div>
    </StoryStage>
  );
}

/** Phone: caption, the four-dot timeline (labels only), and the reply row. */
export function LoginStoryCompact({ className }) {
  const phase = useLoginPhase();

  return (
    <div
      data-story-phase={phase}
      className={cn(
        'flex h-[226px] flex-col justify-between overflow-hidden rounded-[18px] border border-white/[0.07] bg-ink-stage p-5',
        className,
      )}
    >
      <StoryCaption
        captions={S.captions}
        index={loginCaptionIndex(phase)}
        minHeightClass="min-h-[50px]"
        className="text-[21px] leading-[1.15] tracking-[-0.02em]"
      />
      <FollowUpTimeline phase={phase} compact />
      <motion.p
        initial={false}
        animate={{ opacity: phase >= 5 ? 1 : 0 }}
        transition={storyFade}
        className="flex items-center gap-2 text-sm text-white/80"
      >
        <Dot />{S.compactReply}
      </motion.p>
    </div>
  );
}
