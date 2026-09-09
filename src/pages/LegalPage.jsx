import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PrivacyPolicy, TermsOfService, LegalDisclaimer } from '@/components/legal/PolicyContent';
import Logo from '../components/brand/Logo';

// Public, unauthenticated policy page. `doc` selects which sections to show so
// /privacy and /terms reuse the exact text from Settings → Legal.
export default function LegalPage({ doc = 'privacy' }) {
  const title = doc === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  useEffect(() => { document.title = `${title} · ApplyDir`; }, [title]);

  return (
    <div className="min-h-screen bg-neutral/20 font-roboto">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-xl border-b border-neutral-dark">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/register" className="flex items-center gap-2.5">
            <Logo height={24} />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-dark hover:text-black-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign up
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-black font-montserrat">{title}</h1>
          <p className="text-sm text-secondary-dark mt-1">
            <Link to="/privacy" className={`hover:underline ${doc === 'privacy' ? 'text-primary-dark font-semibold' : ''}`}>Privacy</Link>
            {' · '}
            <Link to="/terms" className={`hover:underline ${doc === 'terms' ? 'text-primary-dark font-semibold' : ''}`}>Terms</Link>
          </p>
        </div>

        {doc === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
        <LegalDisclaimer />
      </main>
    </div>
  );
}
