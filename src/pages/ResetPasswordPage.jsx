import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Rocket, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { resetPasswordConfirm } from '../services/apiAuth';
import SmallSpinner from '../components/SmallSpinner';

// Mirrors RegisterSerializer.validate_password: min 8 + uppercase + digit.
const RULES = [
  { test: (v) => v.length >= 8, label: 'at least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'one uppercase letter' },
  { test: (v) => /[0-9]/.test(v), label: 'one number' },
];

const PwInput = ({ id, label, value, onChange, show, onToggle }) => (
  <div className="relative">
    <input
      id={id}
      type={show ? 'text' : 'password'}
      required
      value={value}
      onChange={onChange}
      placeholder={label}
      autoComplete="new-password"
      className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-black px-3 py-3 pr-10 text-sm font-roboto outline-none focus:border-[rgba(255,91,46,0.60)]"
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.30)] hover:text-[rgba(255,255,255,0.70)] transition-colors"
    >
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  </div>
);

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';

  const [pw, setPw] = useState('');
  const [cfm, setCfm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // A link with no uid/token can never succeed — treat it as invalid up front.
  const [linkInvalid, setLinkInvalid] = useState(!uid || !token);
  const [error, setError] = useState('');

  const failedRules = RULES.filter((r) => !r.test(pw));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (failedRules.length) {
      setError(`Password needs ${failedRules.map((r) => r.label).join(', ')}.`);
      return;
    }
    if (pw !== cfm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetPasswordConfirm({ uid, token, new_password: pw });
      setDone(true);
    } catch (err) {
      if (err.response?.status === 400 && /invalid or expired/i.test(err.message)) {
        setLinkInvalid(true);
      } else {
        // Backend AUTH_PASSWORD_VALIDATORS rejection (e.g. too common) or a
        // network/server failure — show the message inline and let them retry.
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (done) {
    body = (
      <div className="text-center">
        <CheckCircle2 size={28} className="mx-auto mb-4 text-[#0A9396]" />
        <h1 className="font-montserrat font-bold text-xl mb-2">Password updated</h1>
        <p className="text-[rgba(255,255,255,0.55)] text-sm font-roboto mb-6">
          Your password has been reset. Sign in with your new password.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center w-full h-12 rounded-lg font-montserrat font-semibold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
        >
          Sign in
        </Link>
      </div>
    );
  } else if (linkInvalid) {
    body = (
      <div className="text-center">
        <AlertTriangle size={28} className="mx-auto mb-4 text-[#FF5B2E]" />
        <h1 className="font-montserrat font-bold text-xl mb-2">This link has expired</h1>
        <p className="text-[rgba(255,255,255,0.55)] text-sm font-roboto mb-6">
          Reset links are valid for 1 hour and can only be used once.
          Request a fresh one and try again.
        </p>
        <Link
          to="/forgot-password"
          className="inline-flex items-center justify-center w-full h-12 rounded-lg font-montserrat font-semibold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
        >
          Request a new link
        </Link>
      </div>
    );
  } else {
    body = (
      <>
        <h1 className="font-montserrat font-bold text-xl mb-1">Choose a new password</h1>
        <p className="text-[rgba(255,255,255,0.45)] text-sm font-roboto mb-6">
          Minimum 8 characters, with an uppercase letter and a number.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <PwInput
            id="new-password" label="New password" value={pw}
            onChange={(e) => { setPw(e.target.value); setError(''); }}
            show={showPw} onToggle={() => setShowPw((p) => !p)}
          />
          <PwInput
            id="confirm-password" label="Confirm new password" value={cfm}
            onChange={(e) => { setCfm(e.target.value); setError(''); }}
            show={showPw} onToggle={() => setShowPw((p) => !p)}
          />
          {error && <p className="text-red-400 text-xs font-roboto">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-lg font-montserrat font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
          >
            {busy ? (<><SmallSpinner /><span>Updating…</span></>) : 'Reset password'}
          </button>
        </form>
      </>
    );
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-white p-6">
      <div className="flex items-center gap-2 mb-8">
        <Rocket size={18} className="rotate-45" style={{ color: '#FF5B2E' }} />
        <span className="font-montserrat font-semibold text-lg">
          Apply<span className="font-extrabold bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent">DIR</span>
        </span>
      </div>
      <div className="w-full max-w-md bg-[#12131C]/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl">
        {body}
        {!done && (
          <p className="text-[rgba(255,255,255,0.35)] text-sm font-roboto text-center mt-6">
            <Link to="/" className="text-[#FF5B2E] hover:text-[#B82E07] font-semibold">Back to sign in</Link>
          </p>
        )}
      </div>
    </section>
  );
};

export default ResetPasswordPage;
