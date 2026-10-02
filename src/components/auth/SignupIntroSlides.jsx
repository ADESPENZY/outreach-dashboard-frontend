import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Logo from '../brand/Logo';
import PillButton from './PillButton';
import useStoryTimeline from './useStoryTimeline';
import { IntroCard, PersonCard, RoleCard, SIGNUP_TIMELINE, useTypedText } from './SignupStory';
import { INTRO_SLIDES, SIGNUP_STORY } from './storyContent';
import {
  EASE_IN_OUT, EASE_OUT, FOCUS_RING, SWIPE_PX, slideSwap,
} from './authMotion';

/**
 * Phone-only intro before the signup form (AUTH_DESIGN_GUIDE.md §6).
 *
 * Shown the first time only: finishing or skipping writes
 * localStorage['applydir_auth_intro_seen'] = '1'. Swipe left/right moves
 * between slides; Continue on the last one opens the form.
 */

const SEEN_KEY = 'applydir_auth_intro_seen';
const PHONE_QUERY = '(max-width: 1023.98px)';

export function markSignupIntroSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage blocked: the slides just show again next time */
  }
}

/** True on a phone-width viewport for a visitor who hasn't seen the slides. */
export function shouldShowSignupIntro() {
  if (typeof window === 'undefined' || !window.matchMedia?.(PHONE_QUERY).matches) return false;
  try {
    return window.localStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

/* ── Scenes ──────────────────────────────────────────────────────────── */

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: EASE_OUT, delay },
});

const BlankCard = () => (
  <div aria-hidden="true" className="rounded-[18px] border border-white/10 bg-ink-soft p-4 opacity-40">
    <span className="block h-1.5 w-1/3 rounded-full bg-white/15" />
    <span className="mt-3 block h-2 w-3/4 rounded-full bg-white/15" />
  </div>
);

/** 1: the role that fits, highlighted between two dimmed blank ones. */
function ScenePick() {
  return (
    <div className="flex flex-col gap-3">
      <motion.div {...rise(0)}><BlankCard /></motion.div>
      <motion.div {...rise(0.12)}><RoleCard highlighted /></motion.div>
      <motion.div {...rise(0.24)}><BlankCard /></motion.div>
    </div>
  );
}

/** 2: the role, a thread drawing down, the person who hires for it. */
function ScenePerson() {
  return (
    <div className="flex flex-col items-start">
      <motion.span
        {...rise(0)}
        className="ml-3 inline-flex items-center rounded-full border border-primary-light/45 bg-ink-soft px-3 py-1.5 text-sm text-white"
      >
        {SIGNUP_STORY.role.title}
      </motion.span>
      <motion.span
        aria-hidden="true"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: EASE_IN_OUT, delay: 0.3 }}
        style={{ originY: 0 }}
        className="ml-8 block h-14 w-0.5 bg-primary-light"
      />
      <motion.div {...rise(1.0)} className="w-full">
        <PersonCard />
      </motion.div>
    </div>
  );
}

/** 3: the introduction types, then Approve, then sent. Loops while shown. */
const SLIDE_TIMELINE = {
  steps: SIGNUP_TIMELINE.steps
    .filter((s) => s.phase >= 3)
    .map((s, _, all) => ({ ...s, at: s.at - all[0].at })),
  loopMs: SIGNUP_TIMELINE.loopMs - SIGNUP_TIMELINE.steps.find((s) => s.phase === 3).at,
};

function SceneIntro() {
  const reduced = useReducedMotion();
  const phase = useStoryTimeline(SLIDE_TIMELINE, { enabled: !reduced, startDelayMs: 0 });
  const typed = useTypedText(SIGNUP_STORY.intro.body, phase === 3);
  return (
    <motion.div {...rise(0)}>
      <IntroCard phase={phase} typed={typed} />
    </motion.div>
  );
}

const SCENES = [ScenePick, ScenePerson, SceneIntro];

/* ── Slides ──────────────────────────────────────────────────────────── */

export default function SignupIntroSlides({ onDone }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const last = INTRO_SLIDES.length - 1;

  const finish = () => {
    markSignupIntroSeen();
    onDone();
  };
  const go = (next) => {
    if (next < 0) return;
    if (next > last) {
      finish();
      return;
    }
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  const Scene = SCENES[index];
  const slide = INTRO_SLIDES[index];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] font-sans text-white antialiased">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        <header className="flex items-center justify-between gap-3">
          <Logo tone="reversed" height={24} />
          <button
            type="button"
            onClick={finish}
            className={`-mr-2 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-white/70 transition-colors hover:text-white ${FOCUS_RING}`}
          >
            Skip
          </button>
        </header>

        {/* Swipe surface. touch-pan-y keeps vertical scrolling native. */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_PX) go(index + 1);
            else if (info.offset.x > SWIPE_PX) go(index - 1);
          }}
          className="mt-5 flex-1 touch-pan-y"
          data-slide={index}
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section
              key={index}
              custom={dir}
              variants={slideSwap}
              initial="enter"
              animate="center"
              exit="exit"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${INTRO_SLIDES.length}`}
            >
              {/* 360px panel; 296px on screens under 740px tall so Continue stays on screen. */}
              <div className="relative flex h-[360px] flex-col justify-center overflow-hidden rounded-[28px] bg-ink-stage p-5 [@media(max-height:739.98px)]:h-[296px]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-28 -right-28 h-64 w-64 rounded-full bg-[radial-gradient(circle,theme(colors.primary.light/35%)_0%,transparent_66%)]"
                />
                <div className="relative">
                  <Scene />
                </div>
              </div>
              <h1 className="mt-7 text-center text-[30px] font-bold leading-[1.1] tracking-[-0.02em]">
                {slide.title}
              </h1>
              <p className="mx-auto mt-3 max-w-[34ch] text-center text-base leading-normal text-white/70">
                {slide.body}
              </p>
            </motion.section>
          </AnimatePresence>
        </motion.div>

        <div aria-hidden="true" className="mt-6 flex justify-center gap-2">
          {INTRO_SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${i === index ? 'bg-primary-light' : 'bg-white/20'}`}
            />
          ))}
        </div>

        <PillButton type="button" onClick={() => go(index + 1)} className="mt-6">
          Continue
        </PillButton>
      </div>
    </div>
  );
}
