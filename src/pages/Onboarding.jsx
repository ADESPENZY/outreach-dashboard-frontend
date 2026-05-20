import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Rocket, User, Target, Mail, CheckCircle,
  ChevronRight, ChevronLeft, ChevronDown, Upload, FileText,
  Loader2, X, Eye, EyeOff, ShieldCheck, Zap, Lock,
} from 'lucide-react';
import { getProfile, createProfile, updateProfile, uploadCV, extractSkills } from '../services/apiProfile';
import { getAutoScoutSettings, updateAutoScoutSettings } from '../services/apiSettings';
import { createGmailAccount } from '../services/apiGmail';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { label: 'Profile & CV',  icon: User        },
  { label: 'Auto-Scout',    icon: Target      },
  { label: 'Connect Inbox', icon: Mail        },
  { label: 'Review',        icon: CheckCircle },
];

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({ value = [], onChange, placeholder, pillClass }) {
  const [inputVal, setInputVal] = useState('');

  const addTags = (raw) => {
    const incoming = raw.split(',').map(t => t.trim()).filter(Boolean);
    const next = [...new Set([...value, ...incoming.filter(t => !value.includes(t))])];
    onChange(next);
    setInputVal('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputVal.trim()) addTags(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 bg-white min-h-[52px] focus-within:border-primary-light/50 focus-within:ring-2 focus-within:ring-primary-light/10 transition-all cursor-text">
      {value.map(tag => (
        <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${pillClass}`}>
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter(t => t !== tag))}
            className="hover:opacity-60 transition-opacity ml-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputVal.trim() && addTags(inputVal)}
        placeholder={value.length === 0 ? placeholder : 'Add more…'}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
      />
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', rightSlot }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all ${rightSlot ? 'pr-10' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

// ── Review helpers ────────────────────────────────────────────────────────────

function ReviewSection({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex px-4 py-2.5 gap-4">
      <span className="text-xs font-semibold text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-xs text-gray-700 break-all">{value || '—'}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode     = searchParams.get('edit') === 'true';
  const { checkAuth }  = useAuth();

  // Step 1
  const [form, setForm]               = useState({ full_name: '', location: '', phone: '', linkedin_url: '' });
  const [cvFile, setCvFile]           = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploaded, setCvUploaded]   = useState(false);
  const [cvExtracting, setCvExtracting] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Step 2
  const [jobTitles, setJobTitles]       = useState([]);
  const [jobLocations, setJobLocations] = useState([]);

  // Step 3
  const [gmailEmail, setGmailEmail]           = useState('');
  const [gmailPassword, setGmailPassword]     = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [warmupEnabled, setWarmupEnabled]     = useState(false);
  const [gmailConnected, setGmailConnected]   = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailError, setGmailError]           = useState('');
  const [appPassGuideOpen, setAppPassGuideOpen] = useState(false);

  // Cross-step
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Load existing profile and auto-scout settings on mount
  useEffect(() => {
    Promise.all([
      getProfile().catch(() => null),
      getAutoScoutSettings().catch(() => null),
    ]).then(([profile, settings]) => {
      if (profile) {
        setProfileExists(true);
        setForm({
          full_name:    profile.full_name    || '',
          location:     profile.location     || '',
          phone:        profile.phone        || '',
          linkedin_url: profile.linkedin_url || '',
        });
        if (profile.cv_raw_text) setCvUploaded(true);
      }
      if (settings) {
        setJobTitles(settings.target_job_titles   ?? []);
        setJobLocations(settings.target_locations ?? []);
      }
    });
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── CV upload ─────────────────────────────────────────────────────────────

  const handleFileSelect = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    setCvFile(file);        // INSTANT — badge renders before any network call
    setCvUploading(true);

    try {
      if (!profileExists) {
        await createProfile({ full_name: form.full_name, location: form.location, phone: form.phone, linkedin_url: form.linkedin_url });
        setProfileExists(true);
      }

      const fd = new FormData();
      fd.append('cv', file);
      await uploadCV(fd);
      setCvUploaded(true);

      // AI extraction runs in background — does not block step progression
      setCvExtracting(true);
      extractSkills()
        .catch(() => {})
        .finally(() => setCvExtracting(false));

    } catch {
      toast.error('CV upload failed. Please try again.');
      setCvFile(null);
    } finally {
      setCvUploading(false);
    }
  };

  // ── Step navigation ───────────────────────────────────────────────────────

  const handleNext = async () => {
    if (step === 1) {
      if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
      if (!cvUploaded)            { toast.error('Please upload your CV to continue'); return; }
      setSaving(true);
      try {
        if (profileExists) {
          await updateProfile({ full_name: form.full_name, location: form.location, phone: form.phone, linkedin_url: form.linkedin_url });
        } else {
          await createProfile({ full_name: form.full_name, location: form.location, phone: form.phone, linkedin_url: form.linkedin_url });
          setProfileExists(true);
        }
        setStep(2);
      } catch { toast.error('Failed to save. Please try again.'); }
      finally   { setSaving(false); }
      return;
    }

    if (step === 2) {
      if (jobTitles.length === 0)    { toast.error('Add at least one job title'); return; }
      if (jobLocations.length === 0) { toast.error('Add at least one location'); return; }
      setSaving(true);
      try {
        await updateAutoScoutSettings({ target_job_titles: jobTitles, target_locations: jobLocations });
        setStep(3);
      } catch { toast.error('Failed to save preferences. Please try again.'); }
      finally   { setSaving(false); }
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }
  };

  const handleConnectGmail = async () => {
    if (!gmailEmail.trim() || !gmailPassword.trim()) {
      setGmailError('Email and App Password are required');
      return;
    }
    setGmailConnecting(true);
    setGmailError('');
    try {
      await createGmailAccount({ email: gmailEmail, app_password: gmailPassword, warmup_enabled: warmupEnabled });
      setGmailConnected(true);
    } catch (err) {
      setGmailError(err.message || 'Failed to verify credentials. Check your Gmail App Password.');
    } finally {
      setGmailConnecting(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await updateProfile({ onboarding_complete: true });
      await checkAuth();
      toast.success('Setup complete! Welcome to OutreachOS.');
      navigate('/dashboard', { replace: true });
    } catch {
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const nextDisabled =
    saving ||
    (step === 1 && (cvUploading || !cvUploaded || !form.full_name.trim())) ||
    (step === 2 && (jobTitles.length === 0 || jobLocations.length === 0)) ||
    (step === 3 && !gmailConnected && !isEditMode);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral flex flex-col items-center justify-center p-4 font-montserrat">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2 rounded-xl shadow-lg">
          <Rocket className="text-white w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Outreach</span>OS
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-2xl">

        {/* Progress header */}
        <div className="p-6 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            {isEditMode ? 'Edit Profile' : 'Account Setup'} — Step {step} of {STEPS.length}
          </p>
          <div className="flex gap-2">
            {STEPS.map((s, i) => {
              const idx    = i + 1;
              const active = step === idx;
              const done   = step > idx;
              const Icon   = s.icon;
              return (
                <div key={s.label} className="flex-1">
                  <div className={`h-1.5 rounded-full mb-2 transition-all duration-300 ${done || active ? 'bg-primary-light' : 'bg-gray-100'}`} />
                  <div className={`flex items-center gap-1.5 ${active ? 'text-primary-dark' : done ? 'text-gray-400' : 'text-gray-300'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold hidden sm:block">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step body */}
        <div className="p-6 space-y-5">

          {/* ── STEP 1: Profile & CV ── */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Profile & CV</h2>
              <p className="text-sm text-gray-500">Your personal details and CV power every outreach email we write for you.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name *"  value={form.full_name}    onChange={v => set('full_name', v)}    placeholder="Joshua Atoyebi" />
                <Field label="Location"     value={form.location}     onChange={v => set('location', v)}     placeholder="Lagos, Nigeria" />
                <Field label="Phone"        value={form.phone}        onChange={v => set('phone', v)}        placeholder="+234 800 000 0000" />
                <Field label="LinkedIn URL" value={form.linkedin_url} onChange={v => set('linkedin_url', v)} placeholder="linkedin.com/in/yourname" />
              </div>

              {/* CV upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CV / Résumé (PDF) <span className="text-primary-light">*</span>
                </label>

                {cvFile ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{cvFile.name}</p>
                      <p className="text-xs text-gray-500">{(cvFile.size / 1024).toFixed(0)} KB · PDF</p>
                    </div>
                    {cvUploading && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-primary-light">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                      </span>
                    )}
                    {cvUploaded && !cvUploading && !cvExtracting && (
                      <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    {cvExtracting && !cvUploading && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-primary-light">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI reading…
                      </span>
                    )}
                    {!cvUploading && (
                      <button
                        onClick={() => {
                          setCvFile(null);
                          setCvUploaded(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors ml-1 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-light/40 hover:bg-primary-light/5 transition-all group">
                    <Upload className="w-7 h-7 text-gray-400 group-hover:text-primary-light mb-2 transition-colors" />
                    <span className="text-sm font-medium text-gray-500 group-hover:text-primary-dark transition-colors">Click to upload PDF</span>
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

                {cvExtracting && (
                  <div className="mt-2.5">
                    <p className="text-xs text-primary-dark font-medium mb-1.5">Extracting your skills with AI…</p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-dark to-primary-light rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 2: Auto-Scout ── */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Auto-Scout Settings</h2>
              <p className="text-sm text-gray-500">Tell the AI what jobs to find for you every day. At least one title and one location required.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Target Job Titles <span className="text-primary-light">*</span>
                  </label>
                  <TagInput
                    value={jobTitles}
                    onChange={setJobTitles}
                    placeholder="e.g. Backend Engineer, Django Developer…"
                    pillClass="bg-primary-light/10 text-primary-dark border-primary-light/20"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Press Enter or , to add each title.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Target Locations <span className="text-primary-light">*</span>
                  </label>
                  <TagInput
                    value={jobLocations}
                    onChange={setJobLocations}
                    placeholder="e.g. Remote, United States, London…"
                    pillClass="bg-blue-50 text-blue-700 border-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Press Enter or , to add each location.</p>
                </div>
              </div>

              {cvExtracting && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-light/5 border border-primary-light/15 text-xs text-primary-dark font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  AI is extracting your CV skills in the background…
                </div>
              )}
            </>
          )}

          {/* ── STEP 3: Connect Inbox ── */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Connect Your Inbox</h2>

              {/* Mission Briefing Banner */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Why we need your inbox</p>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      ApplyDIR automates your cold outreach directly from your personal inbox to ensure high deliverability and genuine response rates. Unlike bulk senders, every email comes from <em>you</em> — making each message feel hand-crafted. Your credentials are fully encrypted at rest and are never shared.
                    </p>
                  </div>
                </div>
              </div>

              {/* Accordion: How to get App Password */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAppPassGuideOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-primary-light shrink-0" />
                    <span className="text-sm font-semibold text-gray-700">
                      How to get your Google App Password
                      <span className="text-xs font-normal text-gray-400 ml-1.5">(Quick 1-Minute Setup)</span>
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${appPassGuideOpen ? 'rotate-180' : ''}`} />
                </button>
                {appPassGuideOpen && (
                  <div className="px-4 py-4 bg-white border-t border-gray-100 space-y-3">
                    {[
                      'Go to your Google Account → Security settings.',
                      'Turn on 2-Step Verification (if not already enabled).',
                      'Search for "App Passwords" and generate a new one named "ApplyDIR".',
                      'Copy the 16-character code and paste it in the field below.',
                    ].map((text, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary-light/15 text-primary-dark text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
                      </div>
                    ))}
                    <a
                      href="https://support.google.com/accounts/answer/185833"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary-light hover:text-primary-dark font-medium underline pt-1"
                    >
                      Open Google's official guide →
                    </a>
                  </div>
                )}
              </div>

              {/* Connected success state */}
              {gmailConnected ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Inbox connected successfully!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{gmailEmail}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Credentials section divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your Credentials</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="space-y-4">
                    <Field
                      label="Gmail Address"
                      value={gmailEmail}
                      onChange={v => { setGmailEmail(v); setGmailError(''); }}
                      placeholder="you@gmail.com"
                    />
                    <Field
                      label="Gmail App Password"
                      type={showPass ? 'text' : 'password'}
                      value={gmailPassword}
                      onChange={v => { setGmailPassword(v); setGmailError(''); }}
                      placeholder="xxxx xxxx xxxx xxxx"
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPass(p => !p)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </div>

                  {/* SMTP error */}
                  {gmailError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                      <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700 font-medium leading-relaxed">{gmailError}</p>
                    </div>
                  )}

                  {/* Warmup toggle + Verify button — grouped at the bottom */}
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Enable Email Warmup</p>
                        <p className="text-xs text-gray-500 mt-0.5">Gradually builds your sender reputation automatically.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWarmupEnabled(e => !e)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${warmupEnabled ? 'bg-primary-light' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${warmupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <button
                      onClick={handleConnectGmail}
                      disabled={gmailConnecting || !gmailEmail.trim() || !gmailPassword.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
                    >
                      {gmailConnecting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Zap className="w-4 h-4" />
                      }
                      {gmailConnecting ? 'Verifying…' : 'Verify & Connect'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── STEP 4: Review ── */}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Review & Complete</h2>
              <p className="text-sm text-gray-500">Everything looks right? Complete your setup to start using OutreachOS.</p>

              <div className="space-y-3">
                <ReviewSection title="Profile">
                  <ReviewRow label="Name"     value={form.full_name} />
                  <ReviewRow label="Location" value={form.location} />
                  <ReviewRow label="Phone"    value={form.phone} />
                  <ReviewRow label="LinkedIn" value={form.linkedin_url} />
                </ReviewSection>

                <ReviewSection title="CV">
                  <ReviewRow label="Status" value={cvUploaded ? 'Uploaded ✓' : 'Not uploaded'} />
                </ReviewSection>

                <ReviewSection title="Auto-Scout">
                  <ReviewRow label="Job Titles" value={jobTitles.join(', ')    || '—'} />
                  <ReviewRow label="Locations"  value={jobLocations.join(', ') || '—'} />
                </ReviewSection>

                <ReviewSection title="Connected Inbox">
                  <ReviewRow label="Gmail"   value={gmailEmail    || '—'} />
                  <ReviewRow label="Warmup"  value={warmupEnabled ? 'Enabled' : 'Disabled'} />
                </ReviewSection>
              </div>
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 pb-6 flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:border-gray-300 transition-all disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={nextDisabled}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-all shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Next'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition-all shadow-sm"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />
              }
              {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
