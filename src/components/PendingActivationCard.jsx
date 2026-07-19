import { Sparkles, Mail, Clock } from 'lucide-react';

/**
 * PendingActivationCard — the white-glove invite-only state.
 *
 * Shown wherever the user would otherwise see the "Connect Gmail" button but
 * their account hasn't been personally activated yet. This must feel premium
 * and deliberate — concierge onboarding, never a waitlist apology or an
 * error. NEVER mention Google Cloud, test users, allowlists, OAuth or
 * verification here.
 */
export default function PendingActivationCard({ compact = false }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-primary-light/25 bg-gradient-to-br from-primary-light/[0.06] via-white to-white ${compact ? 'p-5' : 'p-6 md:p-7'}`}>
      {/* soft glow accent */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/10 blur-2xl" />

      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shrink-0 shadow-md shadow-primary-light/30">
          <Sparkles className="w-5 h-5 text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-1">
            Pilot access
          </p>
          <h3 className="text-base md:text-lg font-bold font-montserrat text-black leading-snug">
            Your account is being activated
          </h3>
          <p className="text-sm text-secondary-dark mt-2 leading-relaxed">
            We set up each new account personally during the pilot. You&rsquo;ll
            get an email within 24 hours — then connecting takes one click.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-dark">
              <Clock className="w-3.5 h-3.5 text-primary-dark" /> Usually much faster
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-dark">
              <Mail className="w-3.5 h-3.5 text-primary-dark" /> We&rsquo;ll email you the moment you&rsquo;re live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
