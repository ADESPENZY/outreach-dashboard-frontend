import { useState } from 'react';
import {
  Shield, Mail, ChevronRight, ChevronLeft, X, ExternalLink,
  Lock, Rocket, AlertTriangle, Zap, Globe, Inbox,
} from 'lucide-react';
import { ApplyDirLoader } from './ui/ApplyDirLoader';

// ── Connect-Gmail flow (light, on-brand) ──────────────────────────────────
// A 3-step modal: the mission → connect Gmail via App Password → warm-up ask.
// Styled with the ApplyDir light palette (white surfaces, orange accents) so it
// matches the rest of the app. onComplete({ email, app_password, warmup_enabled }).

const STEPS = ['Your Mission', 'Connect Gmail', 'Protect Your Domain'];

const VALUE_PROPS = [
  { icon: Zap,   title: 'Zero-Effort Matching', body: 'AI instantly flags the roles most likely to land you an interview.' },
  { icon: Globe, title: 'Source From Anywhere', body: 'Roles from LinkedIn, remote boards, ATS listings — each scored against your CV.' },
  { icon: Inbox, title: '100% Personal Delivery', body: "Sent from your own inbox, so it lands in the recruiter's primary folder." },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg relative overflow-hidden rounded-2xl bg-white border border-neutral-dark shadow-2xl font-roboto">
        {/* Faint warm glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary-light/10 blur-3xl" />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-secondary-dark/60 hover:text-black-light hover:bg-neutral transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step progress */}
        <div className="px-6 md:px-8 pt-8">
          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${
                  i + 1 <= step ? 'bg-gradient-to-r from-primary-light to-primary-dark' : 'bg-neutral-dark'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-secondary-dark/60 font-montserrat mb-1">
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </p>
        </div>

        <div className="px-6 md:px-8 pb-8 pt-4 space-y-6 relative z-10">

          {/* ══ STEP 1: The Mission ══ */}
          {step === 1 && (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto bg-gradient-to-br from-primary-light/15 to-primary-light/5 border border-primary-light/20">
                <Rocket className="w-7 h-7 text-primary-dark" />
              </div>

              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-bold text-black-light leading-snug font-montserrat">
                  You are here to land your next big role.
                </h2>
                <p className="text-sm font-semibold text-primary-dark">And we are going to make that happen.</p>
              </div>

              <div className="space-y-3">
                {VALUE_PROPS.map((vp) => (
                  <div key={vp.title} className="flex items-start gap-3 rounded-xl p-3.5 bg-neutral border border-neutral-dark">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 bg-primary-light/10 border border-primary-light/20">
                      <vp.icon className="w-4 h-4 text-primary-dark" />
                    </div>
                    <div>
                      <p className="text-black-light text-sm font-semibold font-montserrat leading-tight">{vp.title}</p>
                      <p className="text-secondary-dark text-xs leading-relaxed mt-0.5">{vp.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 items-start rounded-xl p-3.5 bg-primary-light/5 border border-primary-light/15">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-dark" />
                <p className="text-xs leading-relaxed text-secondary-dark">
                  Your App Password is <strong className="text-black-light">encrypted at rest</strong>. We never see or store
                  your main Google password. Revoke access from your Google account at any time.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-montserrat font-semibold text-sm bg-gradient-to-r from-primary-light to-primary-dark shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Continue
                <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </>
          )}

          {/* ══ STEP 2: Gmail Connection ══ */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl font-bold text-black-light font-montserrat">Connect your Gmail</h2>
                <p className="text-sm mt-1 text-secondary-dark">
                  Follow these 3 steps to generate your App Password directly from Google:
                </p>
              </div>

              <ol className="space-y-4">
                {[
                  {
                    step: 1,
                    content: (
                      <div>
                        <p className="text-sm leading-relaxed text-secondary-dark">
                          Open your Google Account → <strong className="text-black-light">Security</strong> →{' '}
                          <strong className="text-black-light">2-Step Verification</strong> (must be enabled first).
                        </p>
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary-dark hover:text-primary-light transition-colors"
                        >
                          Open Google Security <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ),
                  },
                  {
                    step: 2,
                    content: (
                      <p className="text-sm leading-relaxed text-secondary-dark">
                        Scroll down and click <strong className="text-black-light">&ldquo;App passwords.&rdquo;</strong> Select{' '}
                        <strong className="text-black-light">&ldquo;Mail&rdquo;</strong> as the app and{' '}
                        <strong className="text-black-light">&ldquo;Other (Custom name)&rdquo;</strong> as the device. Name it{' '}
                        <em className="text-black-light">ApplyDir</em>.
                      </p>
                    ),
                  },
                  {
                    step: 3,
                    content: (
                      <p className="text-sm leading-relaxed text-secondary-dark">
                        Google shows a <strong className="text-black-light">16-character password</strong> (4 groups of 4 letters).
                        Copy it and paste it in the field below.
                      </p>
                    ),
                  },
                ].map(({ step: n, content }) => (
                  <li key={n} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 bg-primary-light/10 text-primary-dark border border-primary-light/20">
                      {n}
                    </span>
                    {content}
                  </li>
                ))}
              </ol>

              <div className="space-y-3">
                {[
                  { label: 'Gmail Address', type: 'email', value: email, onChange: setEmail, placeholder: 'you@gmail.com', mono: false },
                  { label: 'App Password', type: 'password', value: appPassword, onChange: setAppPassword, placeholder: 'xxxx xxxx xxxx xxxx', mono: true },
                ].map(({ label, type, value, onChange, placeholder, mono }) => (
                  <div key={label}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className={`w-full rounded-xl px-3 py-2.5 text-sm text-black bg-white border border-neutral-dark outline-none transition-all focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 ${mono ? 'font-mono tracking-widest' : ''}`}
                    />
                  </div>
                ))}
              </div>

              {error && <p className="text-xs font-medium text-red-500">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl text-secondary-dark hover:text-black-light hover:bg-neutral transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleConnect}
                  className="group flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold font-montserrat rounded-xl bg-gradient-to-r from-primary-light to-primary-dark shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <Mail className="w-4 h-4" /> Connect Account
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </>
          )}

          {/* ══ STEP 3: Warmup Ask ══ */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto bg-emerald-50 border border-emerald-200">
                <Shield className="w-7 h-7 text-emerald-600" />
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-black-light font-montserrat">One last thing.</h2>
                <p className="text-sm mt-1 text-secondary-dark">Protect your path to the primary inbox.</p>
              </div>

              <div className="rounded-xl p-5 space-y-3 bg-neutral border border-neutral-dark">
                <p className="text-sm leading-relaxed text-secondary-dark">
                  Because this email hasn&rsquo;t sent high-volume outreach before, Google&rsquo;s filters
                  might flag it as suspicious the moment you ramp up.
                </p>
                <p className="text-sm font-medium leading-relaxed text-black-light">
                  Do you want us to <strong>gently warm up this account</strong> in the background —
                  so your emails land directly in the hiring manager&rsquo;s primary inbox?
                </p>
                <p className="text-xs leading-relaxed text-secondary-dark/80">
                  The Warmup Engine gradually increases your sending volume over 2–4 weeks, mimicking natural
                  human activity. It runs silently and stops once your domain reputation is established.
                </p>
              </div>

              {error && <p className="text-xs font-medium text-red-500">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleFinish(true)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-xl text-white bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98]"
                >
                  {submitting ? <ApplyDirLoader.Button variant="light" /> : <Shield className="w-5 h-5 text-white" />}
                  <span className="text-sm font-bold leading-tight text-center">Yes, protect my domain</span>
                  <span className="text-xs text-emerald-50/80">Recommended</span>
                </button>

                <button
                  onClick={() => handleFinish(false)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-5 px-3 rounded-xl bg-white border border-neutral-dark text-secondary-dark hover:text-black-light hover:border-primary-light/40 disabled:opacity-60 transition-all"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-bold leading-tight text-center">No, risk it</span>
                  <span className="text-xs opacity-70">Skip warmup</span>
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-1 text-xs text-secondary-dark/70 hover:text-secondary-dark transition-colors"
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
