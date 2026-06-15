import { useState } from 'react';
import {
  Shield, Mail, ChevronRight, ChevronLeft, X, ExternalLink,
  Lock, Rocket, AlertTriangle, Loader2, Zap, Globe, Inbox,
} from 'lucide-react';

const STEPS = ['Your Mission', 'Connect Gmail', 'Protect Your Domain'];

const VALUE_PROPS = [
  {
    icon: Zap,
    title: 'Zero-Effort Matching',
    body: 'AI instantly flags the roles most likely to land you an interview.',
  },
  {
    icon: Globe,
    title: 'Hyper-Scouting',
    body: 'Track premium hidden openings across LinkedIn and global tech boards simultaneously.',
  },
  {
    icon: Inbox,
    title: '100% Personal Delivery',
    body: "Secure automation designed to land straight in the recruiter's primary folder.",
  },
];

export default function OnboardingModal({ onClose, onComplete }) {
  const [step, setStep]               = useState(1);
  const [email, setEmail]             = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const handleConnect = () => {
    if (!email.trim() || !appPassword.trim()) {
      setError('Please enter your Gmail address and App Password.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleFinish = async (warmupEnabled) => {
    setSubmitting(true);
    setError('');
    try {
      await onComplete({ email: email.trim(), app_password: appPassword.trim(), warmup_enabled: warmupEnabled });
    } catch (e) {
      setError(e?.message || 'Connection failed. Please check your credentials and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* ── Modal Card ── */}
      <div
        className="w-full max-w-lg relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        style={{ background: 'linear-gradient(160deg, #0F1019 0%, #0B0C10 100%)' }}
      >
        {/* Subtle ambient glow */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #FF5B2E 0%, transparent 70%)' }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/25 hover:text-white/70 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Step progress bar */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full transition-all duration-500"
                style={{
                  background: i + 1 <= step
                    ? 'linear-gradient(90deg, #B82E07, #FF5B2E)'
                    : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
          <p className="text-[rgba(255,255,255,0.30)] text-[10px] font-mono tracking-widest uppercase mb-1">
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </p>
        </div>

        <div className="px-8 pb-8 pt-4 space-y-6 relative z-10">

          {/* ══ STEP 1: The Mission ══ */}
          {step === 1 && (
            <>
              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
                style={{ background: 'linear-gradient(135deg, rgba(184,46,7,0.25) 0%, rgba(255,91,46,0.12) 100%)', border: '1px solid rgba(255,91,46,0.20)' }}>
                <Rocket className="w-7 h-7" style={{ color: '#FF5B2E' }} />
              </div>

              {/* Headline */}
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-bold text-white leading-snug font-montserrat">
                  You are here to land your next big role.
                </h2>
                <p className="text-sm font-semibold" style={{ color: '#FF5B2E' }}>
                  And we are going to make that happen.
                </p>
              </div>

              {/* Value proposition list */}
              <div className="space-y-3">
                {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-xl p-3.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                      style={{ background: 'rgba(255,91,46,0.12)', border: '1px solid rgba(255,91,46,0.18)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: '#FF5B2E' }} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold font-montserrat leading-tight">
                        {title}
                      </p>
                      <p className="text-[rgba(255,255,255,0.50)] text-xs leading-relaxed mt-0.5 font-roboto">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Security note */}
              <div
                className="flex gap-3 items-start rounded-xl p-3.5"
                style={{ background: 'rgba(255,91,46,0.06)', border: '1px solid rgba(255,91,46,0.14)' }}
              >
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FF5B2E' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Your App Password is <strong className="text-white/80">encrypted at rest</strong>. We never see or store
                  your main Google password. Revoke access from your Google account at any time.
                </p>
              </div>

              {/* CTA — kinetic */}
              <button
                onClick={() => setStep(2)}
                className="group relative w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-montserrat font-semibold text-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-orange-500/20"
                style={{ background: 'linear-gradient(135deg, #B82E07 0%, #FF5B2E 100%)' }}
              >
                Launch Job Scraper
                <span className="inline-block transform group-hover:translate-x-1 transition-transform duration-200">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </>
          )}

          {/* ══ STEP 2: Gmail Connection ══ */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl font-bold text-white font-montserrat">Connect your Gmail</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Follow these 3 steps to generate your App Password directly from Google:
                </p>
              </div>

              <ol className="space-y-4">
                {[
                  {
                    step: 1,
                    content: (
                      <div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                          Open your Google Account → <strong className="text-white">Security</strong> →{' '}
                          <strong className="text-white">2-Step Verification</strong> (must be enabled first).
                        </p>
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold transition-colors"
                          style={{ color: '#FF5B2E' }}
                        >
                          Open Google Security <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ),
                  },
                  {
                    step: 2,
                    content: (
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        Scroll down and click <strong className="text-white">"App passwords."</strong> Select{' '}
                        <strong className="text-white">"Mail"</strong> as the app and{' '}
                        <strong className="text-white">"Other (Custom name)"</strong> as the device. Name it{' '}
                        <em className="text-white/80">OutreachOS</em>.
                      </p>
                    ),
                  },
                  {
                    step: 3,
                    content: (
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        Google shows a <strong className="text-white">16-character password</strong> (4 groups of 4 letters).
                        Copy it and paste it in the field below.
                      </p>
                    ),
                  },
                ].map(({ step: n, content }) => (
                  <li key={n} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                      style={{ background: 'rgba(255,91,46,0.15)', color: '#FF5B2E', border: '1px solid rgba(255,91,46,0.25)' }}
                    >
                      {n}
                    </span>
                    {content}
                  </li>
                ))}
              </ol>

              {/* Inputs */}
              <div className="space-y-3">
                {[
                  { label: 'Gmail Address', type: 'email', value: email, onChange: (v) => setEmail(v), placeholder: 'you@gmail.com', mono: false },
                  { label: 'App Password', type: 'password', value: appPassword, onChange: (v) => setAppPassword(v), placeholder: 'xxxx xxxx xxxx xxxx', mono: true },
                ].map(({ label, type, value, onChange, placeholder, mono }) => (
                  <div key={label}>
                    <label
                      className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {label}
                    </label>
                    <input
                      type={type}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-200 focus:ring-[1.5px] focus:ring-[rgba(255,91,46,0.50)] ${mono ? 'font-mono tracking-widest' : ''}`}
                      style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.10)' }}
                    />
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                  style={{ color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.10)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'}
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleConnect}
                  className="group flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-orange-500/20"
                  style={{ background: 'linear-gradient(135deg, #B82E07 0%, #FF5B2E 100%)' }}
                >
                  <Mail className="w-4 h-4" /> Connect Account
                  <span className="inline-block transform group-hover:translate-x-1 transition-transform duration-200">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            </>
          )}

          {/* ══ STEP 3: Warmup Ask ══ */}
          {step === 3 && (
            <>
              {/* Icon */}
              <div
                className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(16,185,129,0.20)' }}
              >
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-white font-montserrat">One last thing.</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Protect your path to the primary inbox.
                </p>
              </div>

              {/* Warmup explanation */}
              <div
                className="rounded-xl p-5 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Because this email hasn't sent high-volume outreach before, Google's filters
                  might flag it as suspicious the moment you ramp up.
                </p>
                <p className="text-sm font-medium leading-relaxed text-white/80">
                  Do you want us to <strong className="text-white">gently warm up this account</strong> in the background —
                  so your emails land directly in the CTO's primary inbox?
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  The Warmup Engine gradually increases your sending volume over 2–4 weeks,
                  mimicking natural human activity. It runs silently and stops once your
                  domain reputation is established.
                </p>
              </div>

              {error && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>{error}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Yes — protect */}
                <button
                  onClick={() => handleFinish(true)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-xl disabled:opacity-60 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-emerald-500/20"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Shield className="w-5 h-5 text-white" />
                  )}
                  <span className="text-sm font-bold leading-tight text-center text-white">
                    Yes, protect my domain
                  </span>
                  <span className="text-xs text-emerald-100/70">Recommended</span>
                </button>

                {/* No — skip */}
                <button
                  onClick={() => handleFinish(false)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-xl disabled:opacity-60 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.50)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; }}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-bold leading-tight text-center">No, risk it</span>
                  <span className="text-xs opacity-60">Skip warmup</span>
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-1 text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >
                <ChevronLeft className="w-3 h-3" /> Go back and change credentials
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
