import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';

/**
 * Socials: LinkedIn points at the founder's personal profile until the company
 * page exists. TikTok is marked as coming rather than linked to a 404 — a dead
 * social link reads as an abandoned product.
 */
const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/joshuaatoyebi', live: true },
  { label: 'TikTok', href: null, live: false },
];

const NAV = [
  { label: 'How it works', href: '#how' },
  { label: 'Why not auto-apply', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

export default function LandingFooter() {
  return (
    <footer className="bg-ink px-5 text-white sm:px-8">
      <div className="mx-auto w-full max-w-6xl py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Logo tone="reversed" height={26} />
            <p className="mt-5 max-w-[36ch] text-[14.5px] leading-relaxed text-white/50">
              Your AI headhunter. It finds who&rsquo;s hiring and introduces you.
            </p>
          </div>

          <div>
            <p className="text-[12.5px] text-white/35">Product</p>
            <ul className="mt-4 space-y-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="text-[14.5px] text-white/70 transition-colors hover:text-white">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[12.5px] text-white/35">Elsewhere</p>
            <ul className="mt-4 space-y-3">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  {s.live ? (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[14.5px] text-white/70 transition-colors hover:text-white"
                    >
                      {s.label}
                    </a>
                  ) : (
                    <span className="text-[14.5px] text-white/35">{s.label} &middot; soon</span>
                  )}
                </li>
              ))}
              <li>
                <a
                  href="mailto:support@applydir.com"
                  className="text-[14.5px] text-white/70 transition-colors hover:text-white"
                >
                  support@applydir.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-ink-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/30">
            &copy; {new Date().getFullYear()} ApplyDir. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-[13px] text-white/50 transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/terms" className="text-[13px] text-white/50 transition-colors hover:text-white">
              Terms
            </Link>
            <Link to="/login" className="text-[13px] text-white/50 transition-colors hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
