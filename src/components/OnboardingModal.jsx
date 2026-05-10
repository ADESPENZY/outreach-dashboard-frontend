import { useState } from 'react';
import { Shield, Mail, ChevronRight, ChevronLeft, X, ExternalLink, Lock, Rocket, AlertTriangle, Loader2 } from 'lucide-react';

const STEPS = ['Your Mission', 'Connect Gmail', 'Protect Your Domain'];

export default function OnboardingModal({ onClose, onComplete }) {
  const [step, setStep]             = useState(1);
  const [email, setEmail]           = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step progress bar */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i + 1 <= step ? 'bg-primary-light' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-8 pb-8 space-y-6">

          {/* ── STEP 1: The Goal ── */}
          {step === 1 && (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light/20 to-primary-dark/10 mx-auto">
                <Rocket className="w-8 h-8 text-primary-dark" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 leading-snug">
                  You are here to land your next big role.
                </h2>
                <p className="text-base text-primary-dark font-semibold">
                  And we are going to make that happen.
                </p>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed text-center">
                OutreachOS sends cold emails directly from your Gmail — no mass-mail platforms,
                no spam triggers. To do that safely, Google requires a special credential called
                an <span className="font-semibold text-gray-700">App Password</span>. It takes
                about 60 seconds to set up, and it gives us the key we need to send on your behalf,
                invisibly, from your own address.
              </p>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
                <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your App Password is <strong>encrypted at rest</strong>. We never see or store
                  your main Google password. You can revoke access from your Google account at any time.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-dark to-primary-light text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
              >
                Let's get it <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ── STEP 2: The Connection ── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Connect your Gmail</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Follow these 3 steps to generate your App Password directly from Google:
                </p>
              </div>

              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-light/15 text-primary-dark text-xs font-bold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Open your Google Account → <strong>Security</strong> → <strong>2-Step Verification</strong> (must be enabled first).
                    </p>
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-primary-dark hover:underline"
                    >
                      Open Google Security <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-light/15 text-primary-dark text-xs font-bold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Scroll down and click <strong>"App passwords."</strong> Select <strong>"Mail"</strong> as the app
                    and <strong>"Other (Custom name)"</strong> as the device. Name it <em>OutreachOS</em>.
                  </p>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-light/15 text-primary-dark text-xs font-bold flex items-center justify-center mt-0.5">
                    3
                  </span>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Google shows a <strong>16-character password</strong> (4 groups of 4 letters).
                    Copy it and paste it in the field below.
                  </p>
                </li>
              </ol>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    Gmail Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    App Password
                  </label>
                  <input
                    type="password"
                    value={appPassword}
                    onChange={e => setAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 font-mono tracking-widest focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleConnect}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
                >
                  <Mail className="w-4 h-4" /> Connect Account
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: The Warmup Ask ── */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 mx-auto">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">One last thing.</h2>
                <p className="text-sm text-gray-500 mt-1">Protect your path to the primary inbox.</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Because this email hasn't sent high-volume outreach before, Google's filters
                  might flag it as suspicious the moment you ramp up.
                </p>
                <p className="text-sm text-gray-800 font-medium leading-relaxed">
                  Do you want us to <strong>gently warm up this account</strong> in the background —
                  so your emails land directly in the CTO's primary inbox?
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  The Warmup Engine gradually increases your sending volume over 2–4 weeks,
                  mimicking natural human activity. It runs silently and stops once your
                  domain reputation is established.
                </p>
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleFinish(true)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-5 px-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                  <span className="text-sm font-bold leading-tight text-center">
                    Yes, protect my domain
                  </span>
                  <span className="text-xs text-emerald-100">Recommended</span>
                </button>

                <button
                  onClick={() => handleFinish(false)}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-5 px-3 bg-white border-2 border-gray-200 text-gray-500 rounded-xl hover:border-gray-300 hover:text-gray-700 disabled:opacity-60 transition-all"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-bold leading-tight text-center">No, risk it</span>
                  <span className="text-xs text-gray-400">Skip warmup</span>
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
