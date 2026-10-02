import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import AuthVoid from './AuthVoid';
import { FOCUS_RING } from './authMotion';

/**
 * The two-column auth layout (AUTH_DESIGN_GUIDE.md §2).
 *
 * lg+: 5/12 form column, 7/12 story column holding one inset panel with the
 * void behind whatever `story` renders. Below lg: one column, no story panel;
 * pages put any phone-only story inside `children`.
 *
 * `headerRight` sits opposite the logo (the login page's InstallButton).
 *
 * Phone: min-h-[100dvh] (never h-screen) and nothing clips, so the page scrolls
 * when content is taller than the screen. Top and bottom padding grow to the
 * safe-area insets so the logo clears the status bar in an installed PWA.
 * Content is top-aligned under a 32px logo row; pages set their own top gap.
 */

// -my-3 keeps the 44px tap target without adding 24px to the phone layout.
const FOOTER_LINK = `-my-3 inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-white lg:my-0 lg:min-h-0 ${FOCUS_RING}`;

export default function AuthShell({ story = null, headerRight = null, children }) {
  return (
    <div className="min-h-[100dvh] bg-ink font-sans text-white antialiased lg:grid lg:min-h-[100svh] lg:grid-cols-12">
      {/* Form column */}
      <div className="flex min-h-[100dvh] flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] lg:col-span-5 lg:min-h-[100svh] lg:px-12 lg:pb-9 lg:pt-11 xl:pl-24 xl:pr-[72px]">
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col lg:mx-0 lg:max-w-none">
          <header className="flex h-8 items-center justify-between gap-3 lg:h-auto">
            <Link
              to="/"
              aria-label="ApplyDir home"
              className={`-my-1.5 inline-flex min-h-11 items-center rounded-md lg:my-0 ${FOCUS_RING}`}
            >
              <Logo tone="reversed" height={24} />
            </Link>
            {headerRight}
          </header>

          <main className="flex flex-1 flex-col lg:justify-center lg:py-12">
            <div className="w-full lg:max-w-[408px]">{children}</div>
          </main>

          <footer className="pt-3.5 text-sm text-white/60 lg:pt-0">
            <Link to="/privacy" className={FOOTER_LINK}>Privacy</Link>
            <span aria-hidden="true" className="mx-2">·</span>
            <Link to="/terms" className={FOOTER_LINK}>Terms</Link>
          </footer>
        </div>
      </div>

      {/* Story column: 20px inset from the window, flush against the form side */}
      <div className="hidden lg:sticky lg:top-0 lg:col-span-7 lg:block lg:h-[100svh] lg:py-5 lg:pr-5">
        <div className="relative h-full overflow-hidden rounded-[28px] border border-white/[0.07] bg-ink-stage">
          <AuthVoid />
          {story && (
            <div className="relative z-10 h-full px-16 pb-11 pt-[52px]">{story}</div>
          )}
        </div>
      </div>
    </div>
  );
}
