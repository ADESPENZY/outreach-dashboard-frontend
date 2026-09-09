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
 */
export default function LandingNav({ signedIn }) {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        stuck ? 'border-b border-stone-line bg-white/85 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="ApplyDir home" className="shrink-0">
          <Logo height={26} />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14.5px] text-[#57534E] transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-xl bg-ink px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-ink-soft"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[14.5px] font-medium text-[#57534E] transition-colors hover:text-ink">
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 items-center rounded-xl bg-ink px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-ink-soft"
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
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-line md:hidden"
        >
          <span className="relative block h-[9px] w-[18px]">
            <span
              className={`absolute left-0 block h-[1.5px] w-full bg-ink transition-transform duration-200 ${
                open ? 'top-1 rotate-45' : 'top-0'
              }`}
            />
            <span
              className={`absolute left-0 block h-[1.5px] w-full bg-ink transition-transform duration-200 ${
                open ? 'top-1 -rotate-45' : 'top-2'
              }`}
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
