import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Upload, FileText, X, ArrowRight, ArrowLeft,
  Sparkles, Check,
} from 'lucide-react';
import { ApplyDirLoader } from '../ui/ApplyDirLoader';
import {
  createProfile, updateProfile, uploadCV, extractSkills,
} from '../../services/apiProfile';

// ── Calibration onboarding ────────────────────────────────────────────────
// A 4-step wizard that replaces the no-CV empty state on the Home page.
// It owns all form state locally and only writes to the backend twice:
//   • Step 1  → createProfile (if needed) + uploadCV + extractSkills
//   • Step 4  → updateProfile (skills + job preferences + onboarding_complete)
// Calibration ends on Step 4 — there is deliberately no 5th screen.
//
// Job-preference keys map to Auto-Scout's source mapping:
//   work_arrangement='remote' / remote_only=true → remote boards + LinkedIn
//   locations + hybrid/onsite                    → LinkedIn location filter
// (see Backend/AutoScout_mapping.md). Source labels are never shown to the user.

const ROLE_OPTIONS = [
  'Software engineering',
  'Frontend',
  'Backend / API',
  'DevOps / Infra',
  'Data / ML',
  'Mobile',
  'Product',
  'Design',
];

const LOCATION_OPTIONS = [
  'Remote anywhere',
  'United States',
  'United Kingdom',
  'Europe',
];

const ARRANGEMENTS = [
  { id: 'remote', label: 'Remote only',      hint: 'Work from anywhere — no commute.' },
  { id: 'hybrid', label: 'Hybrid',           hint: 'A mix of office and home.' },
  { id: 'open',   label: 'Open to anything', hint: 'Show me the best roles, wherever they are.' },
];

const TOTAL_STEPS = 4;

// Skills can come back as strings or objects — coerce to a clean label.
const skillLabel = (s) =>
  typeof s === 'string' ? s : (s?.name || s?.skill || String(s ?? '')).trim();

export default function ActivationFlow({ profile = null, onComplete }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [profileExists, setProfileExists] = useState(!!profile);

  // Step 1 — CV
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [extracted, setExtracted] = useState(null);

  // Step 2 — editable extraction
  const [skills, setSkills] = useState([]);
  const [years, setYears] = useState('');

  // Step 3 / 4 — preferences
  const [roleTypes, setRoleTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [arrangement, setArrangement] = useState('');

  // Step 4 — final save
  const [saving, setSaving] = useState(false);

  // ── Step 1 helpers ───────────────────────────────────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      toast.error('Please choose a PDF file.');
      return;
    }
    setFile(f);
    setUploaded(false); // a new file invalidates any prior extraction
    setExtracted(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  };

  const continueFromCv = async () => {
    if (!file) return;

    // Already processed this file — just advance, don't re-upload.
    if (uploaded && extracted) {
      setStep(2);
      return;
    }

    setUploading(true);
    try {
      if (!profileExists) {
        await createProfile({});
        setProfileExists(true);
      }

      const fd = new FormData();
      fd.append('cv', file);
      await uploadCV(fd);
      setUploaded(true);

      // Synchronous extraction so we can show real results on Step 2.
      const res = await extractSkills();
      const data = res?.extracted || {};
      setExtracted(data);
      setSkills((data.skills || []).map(skillLabel).filter(Boolean));
      setYears(
        data.years_experience !== undefined && data.years_experience !== null
          ? String(data.years_experience)
          : ''
      );
      setStep(2);
    } catch (err) {
      toast.error(err?.message || 'We couldn’t read that CV. Please try again.');
      setFile(null);
      setUploaded(false);
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2 helpers ───────────────────────────────────────────────────────
  const removeSkill = (idx) => setSkills((prev) => prev.filter((_, i) => i !== idx));

  // ── Step 3 / 4 toggles ───────────────────────────────────────────────────
  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  // ── Step 4 — finish ──────────────────────────────────────────────────────
  const completeCalibration = async () => {
    setSaving(true);
    try {
      const parsedYears = years.trim() === '' ? undefined : (Number(years) || years.trim());
      await updateProfile({
        skills_extracted: {
          ...(extracted || {}),
          skills,
          ...(parsedYears !== undefined ? { years_experience: parsedYears } : {}),
        },
        job_preferences: {
          role_types: roleTypes,
          desired_role: roleTypes[0] || '',
          locations,
          work_arrangement: arrangement,
          remote_only: arrangement === 'remote',
        },
        onboarding_complete: true,
      });

      // Refresh the Home queries so the dashboard leaves onboarding.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Calibration complete — your headhunter is on it.');
      onComplete?.();
    } catch (err) {
      toast.error(err?.message || 'Could not save your preferences. Please try again.');
      setSaving(false);
    }
  };

  // ── Per-step gating ──────────────────────────────────────────────────────
  const canContinue =
    (step === 1 && !!file && !uploading) ||
    (step === 2) ||
    (step === 3 && roleTypes.length > 0) ||
    (step === 4 && locations.length > 0 && !!arrangement && !saving);

  // ── Shared button classes (light-mode tokens only) ───────────────────────
  const primaryBtn =
    'inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-light to-primary-dark text-white font-semibold font-montserrat rounded-xl px-5 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 bg-neutral hover:bg-neutral-dark text-black-light font-semibold rounded-xl px-5 py-2.5 transition-all';

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto animate-fade-in font-roboto">
      <div className="max-w-xl mx-auto">

        {/* Brand mark + step track */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-light to-primary-dark flex items-center justify-center shadow-lg shadow-primary-light/30 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold font-montserrat uppercase tracking-widest text-secondary-dark/60">
              Calibration · Step {step} of {TOTAL_STEPS}
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < step ? 'bg-gradient-to-r from-primary-light to-primary-dark' : 'bg-neutral-dark'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 md:p-7">

          {/* ── Screen 1: CV upload ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-montserrat text-black-light">
                  First, let&rsquo;s learn about you
                </h1>
                <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
                  Upload your CV and we&rsquo;ll pull out your skills automatically. It takes about a minute.
                </p>
              </div>

              {file ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                  <span className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black-light truncate">{file.name}</p>
                    <p className="text-xs text-secondary-dark">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => { setFile(null); setUploaded(false); setExtracted(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="p-2 text-secondary-dark/60 hover:text-black-light rounded-lg transition-colors shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-neutral-dark rounded-xl cursor-pointer hover:border-primary-light/40 hover:bg-primary-light/5 transition-all group"
                >
                  <Upload className="w-7 h-7 text-secondary-dark/60 group-hover:text-primary-light mb-2 transition-colors" />
                  <span className="text-sm font-medium text-black-light">Click or drop your PDF here</span>
                  <span className="text-xs text-secondary-dark mt-0.5">We extract your skills automatically</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>
              )}

              <div className="flex justify-end pt-1">
                <button onClick={continueFromCv} disabled={!canContinue} className={primaryBtn}>
                  {uploading ? (
                    <><ApplyDirLoader.Button variant="light" /> Reading your CV…</>
                  ) : (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Screen 2: extraction result ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-montserrat text-black-light">
                  Here&rsquo;s what we found
                </h1>
                <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
                  We extracted these from your CV. Adjust anything that doesn&rsquo;t look right.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-2">
                  Your strongest skills
                </p>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className="inline-flex items-center gap-1.5 bg-neutral border border-neutral-dark rounded-full pl-3 pr-2 py-1.5 text-sm text-black-light"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(i)}
                          className="p-0.5 text-secondary-dark/60 hover:text-red-500 rounded-full transition-colors"
                          aria-label={`Remove ${s}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-dark">No skills detected — that&rsquo;s OK, you can refine later.</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-2">
                  Years of experience
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full max-w-[160px] px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setStep(1)} className={secondaryBtn}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className={primaryBtn}>
                  Looks good <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Screen 3: role types ────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-montserrat text-black-light">
                  What kind of role are you looking for?
                </h1>
                <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
                  Pick as many as fit. We&rsquo;ll prioritise roles that match.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const active = roleTypes.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggle(setRoleTypes, role)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all ${
                        active
                          ? 'bg-primary-light text-white border-primary-light'
                          : 'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      {role}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setStep(2)} className={secondaryBtn}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(4)} disabled={!canContinue} className={primaryBtn}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Screen 4: location + arrangement ────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-montserrat text-black-light">
                  Where do you want to work?
                </h1>
                <p className="mt-1.5 text-sm text-secondary-dark leading-relaxed">
                  Choose your locations and how you&rsquo;d like to work.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-2">
                  Locations
                </p>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map((loc) => {
                    const active = locations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggle(setLocations, loc)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all ${
                          active
                            ? 'bg-primary-light text-white border-primary-light'
                            : 'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-2">
                  Work arrangement
                </p>
                <div className="space-y-2.5">
                  {ARRANGEMENTS.map((a) => {
                    const active = arrangement === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setArrangement(a.id)}
                        className={`w-full flex items-center gap-3 text-left rounded-xl border p-4 transition-all ${
                          active
                            ? 'border-primary-light bg-primary-light/5 ring-2 ring-primary-light/20'
                            : 'border-neutral-dark bg-white hover:border-primary-light/40'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-primary-light' : 'border-neutral-dark'
                          }`}
                        >
                          {active && <span className="w-2.5 h-2.5 rounded-full bg-primary-light" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-black-light">{a.label}</span>
                          <span className="block text-xs text-secondary-dark">{a.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setStep(3)} disabled={saving} className={secondaryBtn}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={completeCalibration} disabled={!canContinue} className={primaryBtn}>
                  {saving ? (
                    <><ApplyDirLoader.Button variant="light" /> Saving…</>
                  ) : (
                    <>Complete Calibration <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
