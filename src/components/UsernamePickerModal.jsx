import { useState } from'react';
import { motion } from'framer-motion';
import { AtSign, CheckCircle } from'lucide-react';
import { ApplyDirLoader } from'./ui/ApplyDirLoader';
import { toast } from'react-toastify';
import { setUsername } from'../services/apiAuth';
import { useAuth } from'../context/AuthContext';

export default function UsernamePickerModal({ onDone }) {
 const { checkAuth } = useAuth();
 const [value, setValue] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const validate = (v) => {
 if (!v) return'Username is required.';
 if (v.length < 3) return'At least 3 characters.';
 if (v.length > 20) return'Max 20 characters.';
 if (!/^[a-zA-Z0-9_]+$/.test(v)) return'Letters, numbers, and underscores only.';
 return'';
 };

 const handleChange = (e) => {
 setValue(e.target.value);
 if (error) setError(validate(e.target.value));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 const err = validate(value.trim());
 if (err) { setError(err); return; }

 setLoading(true);
 setError('');
 try {
 await setUsername(value.trim());
 await checkAuth();
 toast.success(`Username set to @${value.trim()}`);
 onDone();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div
 className="fixed inset-0 z-[100] flex items-center justify-center px-4"
 style={{ background:'rgba(0,0,0,0.82)', backdropFilter:'blur(8px)' }}
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 16 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
 className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.09] shadow-2xl"
 style={{ background:'linear-gradient(160deg, #0F1019 0%, #0B0C10 100%)' }}
 >
 {/* Ambient glow */}
 <div
 className="absolute -top-20 -right-20 w-52 h-52 rounded-full pointer-events-none"
 style={{ background:'radial-gradient(circle, rgba(255,91,46,0.16) 0%, transparent 70%)', filter:'blur(40px)' }}
 />

 <div className="relative z-10 px-8 pt-8 pb-8 space-y-6">

 {/* Icon */}
 <div
 className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
 style={{ background:'rgba(255,91,46,0.12)', border:'1px solid rgba(255,91,46,0.22)' }}
 >
 <AtSign className="w-6 h-6" style={{ color:'#FF5B2E' }} />
 </div>

 {/* Text */}
 <div className="text-center space-y-2">
 <h2 className="text-white font-bold text-xl leading-snug">
 One last thing
 </h2>
 <p className="text-[rgba(255,255,255,0.42)] text-sm leading-relaxed">
 Choose a username for your ApplyDir account. You can always change it later in Settings.
 </p>
 </div>

 {/* Input */}
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <div className={`flex items-center rounded-xl border transition-all ${
 error
 ?'border-red-500/60 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
 :'border-white/10 focus-within:border-[rgba(255,91,46,0.55)] focus-within:shadow-[0_0_0_3px_rgba(184,46,7,0.15)]'
 } bg-black/40 px-4 py-3 gap-2`}>
 <span className="text-[rgba(255,91,46,0.70)] text-sm font-mono select-none">@</span>
 <input
 type="text"
 autoFocus
 value={value}
 onChange={handleChange}
 placeholder="yourname"
 maxLength={20}
 className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
 />
 {value.length >= 3 && !error && (
 <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
 )}
 </div>
 {error && (
 <p className="text-red-400 text-xs mt-1.5">{error}</p>
 )}
 <p className="text-white/20 text-[10px] mt-1.5">
 3–20 characters · letters, numbers, underscores
 </p>
 </div>

 <motion.button
 type="submit"
 disabled={loading}
 whileHover={{ y: -1, boxShadow:'0 0 20px rgba(255,91,46,0.35)' }}
 whileTap={{ y: 0 }}
 className="w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
 style={{ background:'linear-gradient(135deg, #B82E07 0%, #FF5B2E 100%)' }}
 >
 {loading ? <><ApplyDirLoader.Button variant="light" /> Saving…</> :'Set Username'}
 </motion.button>
 </form>
 </div>
 </motion.div>
 </div>
 );
}
