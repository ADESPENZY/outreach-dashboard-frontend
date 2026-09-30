import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#why', label: 'Why not auto-apply' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

/**
 * Marketing header. Transparent over the hero, then a hairline + blur once the
 * page scrolls, so the lockup never sits on moving content.
 *
 * `overRef` is the dark section the nav floats over (the void hero). While that
 * section's bottom is still below the top of the viewport the header is fully
 * transparent and reversed to white; it only takes on the solid treatment once
 * the section has scrolled past. Without the prop it falls back to the plain
 * "solid after 12px" behaviour.
 */
export default function LandingNav({ signedIn, overRef }) {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = overRef?.current;
      setStuck(el ? el.getBoundingClientRect().bottom <= 0 : window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [overRef]);

  // The open mobile drawer is a white panel, so the bar above it goes solid too
  // rather than leaving white-on-white links floating over the hero.
  const solid = stuck || open;
  const reversed = !solid;

  return (
    <header
      // The negative margin lets the bar float over the content instead of
      // reserving a strip above it: a transparent header sitting in normal flow
      // would just show the page's white background as a band over the dark
      // hero. Sections below carry 80px+ of top padding, so nothing an anchor
      // jumps to ends up underneath it.
      className={`sticky top-0 z-50 -mb-[72px] transition-colors duration-200 ${
        solid ? 'border-b border-stone-line bg-white/85 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="ApplyDir home" className="shrink-0">
          <Logo height={26} tone={reversed ? 'reversed' : 'default'} />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-[14.5px] transition-colors ${
                reversed ? 'text-white/70 hover:text-white' : 'text-[#57534E] hover:text-ink'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <Link
              to="/dashboard"
              className={`inline-flex h-10 items-center rounded-xl px-5 text-[14.5px] font-semibold transition-colors ${
                reversed ? 'bg-white text-ink hover:bg-white/90' : 'bg-ink text-white hover:bg-ink-soft'
              }`}
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={`text-[14.5px] font-medium transition-colors ${
                  reversed ? 'text-white/70 hover:text-white' : 'text-[#57534E] hover:text-ink'
                }`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className={`inline-flex h-10 items-center rounded-xl px-5 text-[14.5px] font-semibold transition-colors ${
                  reversed ? 'bg-white text-ink hover:bg-white/90' : 'bg-ink text-white hover:bg-ink-soft'
                }`}
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border md:hidden ${
            reversed ? 'border-white/25' : 'border-stone-line'
          }`}
        >
          <span className="relative block h-[9px] w-[18px]">
            <span
              className={`absolute left-0 block h-[1.5px] w-full transition-transform duration-200 ${
                reversed ? 'bg-white' : 'bg-ink'
              } ${open ? 'top-1 rotate-45' : 'top-0'}`}
            />
            <span
              className={`absolute left-0 block h-[1.5px] w-full transition-transform duration-200 ${
                reversed ? 'bg-white' : 'bg-ink'
              } ${open ? 'top-1 -rotate-45' : 'top-2'}`}
            />
          </span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-stone-line bg-white px-5 pb-6 pt-2 md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block border-b border-stone-line py-3.5 text-[15px] text-[#57534E]"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-5 flex flex-col gap-2.5">
            {signedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white"
                >
                  Get started
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-line text-[15px] font-semibold text-ink"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
