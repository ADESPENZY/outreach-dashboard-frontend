import { useState } from'react';
import { Link } from'react-router-dom';
import { Rocket, Mail } from'lucide-react';
import { forgotPassword } from'../services/apiAuth';
import SmallSpinner from'../components/SmallSpinner';

const ForgotPasswordPage = () => {
 const [email, setEmail] = useState('');
 const [sent, setSent] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');

 const onSubmit = async (e) => {
 e.preventDefault();
 if (!email.trim() || busy) return;
 setBusy(true);
 setError('');
 try {
 await forgotPassword(email.trim());
 setSent(true);
 } catch (err) {
 setError(err.message ||'Something went wrong. Please try again.');
 } finally {
 setBusy(false);
 }
 };

 return (
 <section className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-white p-6">
 <div className="flex items-center gap-2 mb-8">
 <Rocket size={18} className="rotate-45" style={{ color:'#FF5B2E' }} />
 <span className="font-semibold text-lg">
 Apply<span className="font-extrabold bg-gradient-to-r from-[#B82E07] to-[#FF5B2E] bg-clip-text text-transparent">DIR</span>
 </span>
 </div>

 <div className="w-full max-w-md bg-[#12131C]/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl">
 {sent ? (
 <div className="text-center">
 <Mail size={28} className="mx-auto mb-4 text-[#0A9396]" />
 <h1 className="font-bold text-xl mb-2">Check your inbox</h1>
 <p className="text-[rgba(255,255,255,0.55)] text-sm">
 If <span className="text-white">{email.trim()}</span> is registered, a reset
 link is on its way. It expires in 1 hour.
 </p>
 </div>
 ) : (
 <>
 <h1 className="font-bold text-xl mb-1">Forgot your password?</h1>
 <p className="text-[rgba(255,255,255,0.45)] text-sm mb-6">
 Enter your account email and we&apos;ll send you a reset link.
 </p>
 <form onSubmit={onSubmit} className="flex flex-col gap-4">
 <input
 type="email"
 required
 autoFocus
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="you@example.com"
 className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-black px-3 py-3 text-sm outline-none focus:border-[rgba(255,91,46,0.60)]"
 />
 {error && <p className="text-red-400 text-xs">{error}</p>}
 <button
 type="submit"
 disabled={busy}
 className="w-full h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
 style={{ background:'linear-gradient(135deg, #B82E07 70%, #FF5B2E 30%)' }}
 >
 {busy ? (<><SmallSpinner /><span>Sending…</span></>) :'Send reset link'}
 </button>
 </form>
 </>
 )}
 <p className="text-[rgba(255,255,255,0.35)] text-sm text-center mt-6">
 <Link to="/" className="text-[#FF5B2E] hover:text-[#B82E07] font-semibold">Back to sign in</Link>
 </p>
 </div>
 </section>
 );
};

export default ForgotPasswordPage;
