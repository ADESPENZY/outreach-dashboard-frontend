import { useState, useRef, useEffect } from'react';
import { motion, AnimatePresence } from'framer-motion';
import {
 X, Sparkles, Upload, FileText, ShieldCheck,
} from'lucide-react';
import { ApplyDirLoader } from'./ui/ApplyDirLoader';
import { useQueryClient } from'@tanstack/react-query';
import { toast } from'react-toastify';
import { getProfile, createProfile, updateProfile, uploadCV } from'../services/apiProfile';

// ── Field — exact match from Onboarding.jsx ───────────────────────────────────
function Field({ label, value, onChange, placeholder, type ='text' }) {
 return (
 <div>
 <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{label}</label>
 <input
 type={type}
 className="w-full border border-gray-200/60 bg-gray-50/50 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-primary-light/40 focus:ring-4 focus:ring-primary-light/10 transition-all duration-200"
 placeholder={placeholder}
 value={value}
 onChange={e => onChange(e.target.value)}
 />
 </div>
 );
}

// ── ProfileActivationDrawer ───────────────────────────────────────────────────
// Rewritten as a centered modal.
// Props interface is identical to the old drawer so JobsPage.jsx needs no edits.
export default function ProfileActivationDrawer({ isOpen, onClose }) {
 const queryClient = useQueryClient();
 const fileInputRef = useRef(null);
 const extractTimer = useRef(null);

 // Profile form (pre-filled from API on open)
 const [form, setForm] = useState({ full_name:'', location:'', phone:'', linkedin_url:'' });
 const [profileExists, setProfileExists] = useState(false);

 // CV upload state — mirrors Onboarding.jsx Step 1 exactly
 const [cvFile, setCvFile] = useState(null);
 const [cvUploading, setCvUploading] = useState(false);
 const [cvUploaded, setCvUploaded] = useState(false);
 const [cvExtracting, setCvExtracting] = useState(false);

 // Load profile when the modal opens so form fields are pre-filled
 useEffect(() => {
 if (!isOpen) return;
 getProfile()
 .then(profile => {
 if (!profile) return;
 setProfileExists(true);
 setForm({
 full_name: profile.full_name ||'',
 location: profile.location ||'',
 phone: profile.phone ||'',
 linkedin_url: profile.linkedin_url ||'',
 });
 if (profile.cv_raw_text) setCvUploaded(true);
 })
 .catch(() => {/* new user — no profile yet, form starts empty */});
 }, [isOpen]);

 // Clear timer on unmount to avoid state updates on an unmounted component
 useEffect(() => {
 return () => { if (extractTimer.current) clearTimeout(extractTimer.current); };
 }, []);

 const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

 // ── CV upload — unified activation trigger ────────────────────────────────
 const handleFileSelect = async (file) => {
 if (!file || file.type !=='application/pdf') {
 toast.error('Please select a PDF file');
 return;
 }

 setCvFile(file); // immediate — badge renders before any network call
 setCvUploading(true);

 try {
 // Always persist the profile form alongside the CV upload so name /
 // location / phone are saved even if the user only filled them now.
 if (profileExists) {
 await updateProfile({
 full_name: form.full_name,
 location: form.location,
 phone: form.phone,
 linkedin_url: form.linkedin_url,
 });
 } else {
 await createProfile({
 full_name: form.full_name,
 location: form.location,
 phone: form.phone,
 linkedin_url: form.linkedin_url,
 });
 setProfileExists(true);
 }

 const fd = new FormData();
 fd.append('cv', file);
 await uploadCV(fd);
 setCvUploaded(true);

 // uploadCV resolves instantly — the backend spawned _cv_processing_pipeline
 // in a daemon thread to run extract_skills_from_cv + score_all_unscored_jobs.
 // Show the extracting indicator while we bridge that async gap.
 setCvExtracting(true);

 // After 9 s the OpenAI skill extraction + retroactive scoring threads
 // should have completed for most CVs. Close the modal and refresh data.
 extractTimer.current = setTimeout(() => {
 setCvExtracting(false);
 queryClient.invalidateQueries({ queryKey: ['jobs-page'] });
 queryClient.invalidateQueries({ queryKey: ['profile'] });
 toast.success('AI Engine activated! Your job matches are being scored.');
 onClose();
 }, 9000);

 } catch {
 toast.error('CV upload failed. Please try again.');
 setCvFile(null);
 setCvUploaded(false);
 } finally {
 setCvUploading(false);
 }
 };

 // ── Close handler — always safe to close; background thread keeps running ──
 const handleClose = () => {
 if (extractTimer.current) clearTimeout(extractTimer.current);
 setCvFile(null);
 setCvUploaded(false);
 setCvExtracting(false);
 onClose();
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <>
 {/* Backdrop */}
 <motion.div
 key="pac-backdrop"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.22 }}
 className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
 onClick={handleClose}
 />

 {/* Modal card */}
 <motion.div
 key="pac-modal"
 initial={{ opacity: 0, scale: 0.96, y: 18 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.96, y: 18 }}
 transition={{ type:'spring', stiffness: 340, damping: 30 }}
 className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
 >
 <div
 className="w-full max-w-xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100/80 overflow-hidden pointer-events-auto"
 onClick={e => e.stopPropagation()}
 >
 {/* ── Header ──────────────────────────────────────────────── */}
 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center shadow-md shadow-orange-200 shrink-0">
 <Sparkles className="w-4 h-4 text-white" />
 </div>
 <div>
 <h2 className="font-bold text-gray-900 text-base leading-tight">
 Activate AI Engine
 </h2>
 <p className="text-xs text-gray-500 mt-0.5">
 Upload your CV to unlock AI scoring &amp; tailored resumes
 </p>
 </div>
 </div>
 <button
 onClick={handleClose}
 className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
 aria-label="Close"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* ── Body ────────────────────────────────────────────────── */}
 <div className="p-6 space-y-5">

 {/* Profile form grid — exact from Onboarding.jsx Step 1 */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <Field
 label="Full Name"
 value={form.full_name}
 onChange={v => set('full_name', v)}
 placeholder="Joshua Atoyebi"
 />
 <Field
 label="Location"
 value={form.location}
 onChange={v => set('location', v)}
 placeholder="Lagos, Nigeria"
 />
 <Field
 label="Phone"
 value={form.phone}
 onChange={v => set('phone', v)}
 placeholder="+234 800 000 0000"
 />
 <Field
 label="LinkedIn URL"
 value={form.linkedin_url}
 onChange={v => set('linkedin_url', v)}
 placeholder="linkedin.com/in/yourname"
 />
 </div>

 {/* CV upload — exact drop zone layout from Onboarding.jsx */}
 <div>
 <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
 CV / Résumé (PDF) <span className="text-primary-light">*</span>
 </label>

 {cvFile ? (
 /* ── Uploaded success row (emerald green) ── */
 <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
 <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
 <FileText className="w-4 h-4 text-emerald-600" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-gray-800 truncate">{cvFile.name}</p>
 <p className="text-xs text-gray-500">{(cvFile.size / 1024).toFixed(0)} KB · PDF</p>
 </div>

 {/* Uploading indicator */}
 {cvUploading && (
 <span className="flex items-center gap-1.5 text-xs font-medium text-primary-light shrink-0">
 <ApplyDirLoader.Button variant="dark" /> Uploading…
 </span>
 )}

 {/* Settled success check */}
 {cvUploaded && !cvUploading && !cvExtracting && (
 <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
 )}

 {/* AI reading indicator */}
 {cvExtracting && !cvUploading && (
 <span className="flex items-center gap-1.5 text-xs font-medium text-primary-light shrink-0">
 <ApplyDirLoader.Button variant="dark" /> AI reading…
 </span>
 )}

 {/* Remove file — disabled while any async work is in flight */}
 {!cvUploading && !cvExtracting && (
 <button
 type="button"
 onClick={() => {
 setCvFile(null);
 setCvUploaded(false);
 if (fileInputRef.current) fileInputRef.current.value ='';
 }}
 className="text-gray-400 hover:text-gray-600 transition-colors ml-1 shrink-0"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 ) : (
 /* ── Dashed drop zone — exact h-32 layout from Onboarding.jsx ── */
 <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-light/40 hover:bg-primary-light/5 transition-all group">
 <Upload className="w-7 h-7 text-gray-400 group-hover:text-primary-light mb-2 transition-colors" />
 <span className="text-sm font-medium text-gray-500 group-hover:text-primary-dark transition-colors">
 Click to upload PDF
 </span>
 <span className="text-xs text-gray-400 mt-0.5">AI extracts your skills automatically</span>
 <input
 ref={fileInputRef}
 type="file"
 accept=".pdf"
 className="hidden"
 onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
 />
 </label>
 )}

 {/* cvExtracting — blue text + 70% pulsed progress bar from Onboarding.jsx */}
 {cvExtracting && (
 <div className="mt-2.5">
 <p className="text-xs text-primary-dark font-medium mb-1.5">
 Extracting your skills with AI…
 </p>
 <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-primary-dark to-primary-light rounded-full animate-pulse"
 style={{ width:'70%' }}
 />
 </div>
 </div>
 )}
 </div>
 </div>

 {/* ── Footer — visible only during extraction phase ───────── */}
 {cvExtracting && (
 <div className="px-6 pb-5">
 <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-light/5 border border-primary-light/15 text-xs text-primary-dark font-medium">
 <ApplyDirLoader.Button variant="dark" />
 AI is computing your job match scores — this window will close automatically.
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}
