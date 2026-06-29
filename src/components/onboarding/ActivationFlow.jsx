import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Upload, FileText, X, ArrowRight, ArrowLeft,
  Sparkles, Check, Plus,
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

// Role CATEGORIES — the `key` is what we store (and what the backend expands
// into search keywords + gates scoring on); `label` is what the user sees.
// Users can also type custom keywords, which are stored verbatim.
const ROLE_OPTIONS = [
  { key: 'software_engineer',   label: 'Software Engineer' },
  { key: 'backend',             label: 'Backend' },
  { key: 'frontend',            label: 'Frontend' },
  { key: 'devops_cloud',        label: 'DevOps / Cloud' },
  { key: 'data_engineer',       label: 'Data Engineer' },
  { key: 'data_analyst',        label: 'Data Analyst' },
  { key: 'ml_ai',               label: 'ML / AI' },
  { key: 'product_manager',     label: 'Product Manager' },
  { key: 'designer',            label: 'Designer' },
  { key: 'automation',          label: 'Automation' },
  { key: 'security',            label: 'Security' },
  { key: 'qa_test',             label: 'QA / Test' },
  { key: 'engineering_manager', label: 'Engineering Manager' },
  { key: 'technical_writer',    label: 'Technical Writer' },
  { key: 'cloud_architect',     label: 'Cloud Architect' },
];
const ROLE_KEYS = new Set(ROLE_OPTIONS.map((o) => o.key));
// Readable label for a stored role value (preset key → label; custom → verbatim).
const roleLabel = (val) => ROLE_OPTIONS.find((o) => o.key === val)?.label || val;

const LOCATION_OPTIONS = [
  'Remote anywhere',
  'United States',
  'United Kingdom',
  'Europe',
];

const ARRANGEMENTS = [
  { id: 'remote', label: 'Remote only',      hint: 'Work from anywhere — no commute.' },
  { id: 'hybrid', label: 'Hybrid',           hint: 'A mix of office and home.' },
  { id: 'onsite', label: 'Onsite only',      hint: 'In-office roles in your chosen locations.' },
  { id: 'open',   label: 'Open to anything', hint: 'Show me the best roles, wherever they are.' },
];

// Onsite/Hybrid are PHYSICAL arrangements — they need a real region to search,
// so the "Remote anywhere" location is contradictory for them (it would scrape
// onsite roles "located anywhere-remotely"). The step-4 UI blocks that combo.
const PHYSICAL_ARRANGEMENTS = new Set(['onsite', 'hybrid']);
const REMOTE_ANYWHERE = 'Remote anywhere';

// Single-select seniority chips. `years` is the representative number we persist
// to skills_extracted.years_experience so the backend keeps a numeric value.
const EXPERIENCE_LEVELS = [
  { id: 'junior', label: 'Junior',          range: '0–2 yrs', years: 1 },
  { id: 'mid',    label: 'Mid-Level',       range: '3–5 yrs', years: 4 },
  { id: 'senior', label: 'Senior',          range: '5–8 yrs', years: 6 },
  { id: 'lead',   label: 'Lead / Director', range: '',        years: 10 },
];

const TOTAL_STEPS = 4;

// Skills can come back as strings or objects — coerce to a clean label.
const skillLabel = (s) =>
  typeof s === 'string' ? s : (s?.name || s?.skill || String(s ?? '')).trim();

// Map an extracted years-of-experience number onto a seniority bucket.
const yearsToLevel = (n) => {
  if (n === undefined || n === null || n === '') return '';
  const y = Number(n);
  if (Number.isNaN(y)) return '';
  if (y <= 2) return 'junior';
  if (y <= 5) return 'mid';
  if (y <= 8) return 'senior';
  return 'lead';
};

// Small reusable "type a value + add as a chip" row (ghost add button).
function ChipInput({ value, onChange, onAdd, placeholder, addLabel }) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
      />
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl border border-neutral-dark text-secondary-dark hover:text-primary-dark hover:border-primary-light/40 text-sm font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
}

export default function ActivationFlow({ profile = null, onComplete }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // ── Resume support ───────────────────────────────────────────────────────
  // If the user already uploaded a CV but didn't finish (e.g. closed the tab
  // after step 1), pick up at the skills step with their extracted data and any
  // preferences already saved — onboarding never silently disappears.
  const resuming = !!(profile && (profile.cv_raw_text || '').trim());
  const savedPrefs = profile?.job_preferences || {};
  const initialSkills = (() => {
    const se = profile?.skills_extracted;
    const list = Array.isArray(se) ? se : (se && Array.isArray(se.skills) ? se.skills : []);
    return list.map(skillLabel).filter(Boolean);
  })();
  const initialExperience = savedPrefs.seniority
    || (() => {
      const se = profile?.skills_extracted;
      return yearsToLevel(se && !Array.isArray(se) ? se.years_experience : undefined);
    })();

  const [step, setStep] = useState(resuming ? 2 : 1);
  const [profileExists, setProfileExists] = useState(!!profile);

  // Step 1 — CV
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(resuming);
  const [extracted, setExtracted] = useState(null);

  // Step 2 — editable extraction
  const [skills, setSkills] = useState(initialSkills);
  const [experienceLevel, setExperienceLevel] = useState(initialExperience);
  const [newSkill, setNewSkill] = useState('');

  // Step 3 / 4 — preferences
  const [roleTypes, setRoleTypes] = useState(Array.isArray(savedPrefs.role_types) ? savedPrefs.role_types : []);
  const [locations, setLocations] = useState(Array.isArray(savedPrefs.locations) ? savedPrefs.locations : []);
  const [arrangement, setArrangement] = useState(savedPrefs.work_arrangement || '');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Step 4 — final save
  const [saving, setSaving] = useState(false);

  // Defensive self-heal: the step-4 UI prevents a physical arrangement (onsite/
  // hybrid) from coexisting with the "Remote anywhere" location, but legacy
  // profiles or edits made outside this wizard could seed that contradiction on
  // mount. Strip it whenever the arrangement is (or becomes) physical so it can
  // never be re-saved.
  useEffect(() => {
    if (PHYSICAL_ARRANGEMENTS.has(arrangement)) {
      setLocations((prev) =>
        prev.includes(REMOTE_ANYWHERE) ? prev.filter((l) => l !== REMOTE_ANYWHERE) : prev
      );
    }
  }, [arrangement]);

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
      setExperienceLevel(yearsToLevel(data.years_experience));
      // Pre-select the role categories the AI judged this CV qualifies for, so
      // step 3 guides users who don't know which titles to search for. Only
      // when they haven't already chosen (don't override a returning user).
      const suggested = (data.suggested_role_categories || []).filter((k) => ROLE_KEYS.has(k));
      if (suggested.length) setRoleTypes((prev) => (prev.length ? prev : suggested));
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

  // Append a free-typed value to an array (case-insensitive de-dupe), then clear.
  const addCustom = (setArr, value, clear) => {
    const v = value.trim();
    if (!v) return;
    setArr((prev) => (prev.some((x) => x.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
    clear('');
  };
  const addSkill    = () => addCustom(setSkills,    newSkill,    setNewSkill);
  const addRole     = () => addCustom(setRoleTypes, newRole,     setNewRole);
  const addLocation = () => addCustom(setLocations, newLocation, setNewLocation);

  // ── Step 3 / 4 toggles ───────────────────────────────────────────────────
  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const removeValue = (setter, value) => setter((prev) => prev.filter((v) => v !== value));

  // ── Step 4 — finish ──────────────────────────────────────────────────────
  const completeCalibration = async () => {
    setSaving(true);
    try {
      const level = EXPERIENCE_LEVELS.find((l) => l.id === experienceLevel);
      // Capture the user's timezone so their daily scrape runs at ~5 AM THEIR
      // local time (jobs waiting when they wake up), not a single global time.
      let browserTz = '';
      try { browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* noop */ }
      await updateProfile({
        skills_extracted: {
          ...(extracted || {}),
          skills,
          ...(level ? { years_experience: level.years } : {}),
        },
        job_preferences: {
          role_types: roleTypes,
          desired_role: roleTypes[0] || '',
          seniority: experienceLevel || '',
          locations,
          work_arrangement: arrangement,
          remote_only: arrangement === 'remote',
        },
        ...(browserTz ? { timezone: browserTz } : {}),
        onboarding_complete: true,
      });

      // Refresh the Home queries so the dashboard leaves onboarding.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Calibration complete — your headhunter is searching now, and every morning from here.');
      onComplete?.();
    } catch (err) {
      toast.error(err?.message || 'Could not save your preferences. Please try again.');
      setSaving(false);
    }
  };

  // Role categories the AI matched to this CV — used to guide (and pre-select)
  // the user in step 3 so they don't have to guess a title.
  const suggestedSet = new Set(
    (extracted?.suggested_role_categories || []).filter((k) => ROLE_KEYS.has(k)),
  );

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
    <div className="flex-1 w-full bg-neutral p-4 md:p-8 animate-fade-in font-roboto">
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
        <div className="bg-white rounded-2xl border border-neutral-dark shadow-md p-5 md:p-7">

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
                  <p className="text-sm text-secondary-dark">No skills detected — add your own below.</p>
                )}
                <div className="mt-2.5">
                  <ChipInput
                    value={newSkill}
                    onChange={setNewSkill}
                    onAdd={addSkill}
                    placeholder="Add a skill…"
                    addLabel="Add Skill"
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-2">
                  Experience level
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((l) => {
                    const active = experienceLevel === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setExperienceLevel((prev) => (prev === l.id ? '' : l.id))}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all ${
                          active
                            ? 'bg-primary-light text-white border-primary-light'
                            : 'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        {l.label}{l.range ? ` (${l.range})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {/* No way back to the upload screen when resuming (CV already on
                    file and no local file to re-continue with) — avoids a dead end. */}
                {file ? (
                  <button onClick={() => setStep(1)} className={secondaryBtn}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                ) : <span />}
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
                  {suggestedSet.size > 0
                    ? 'Based on your CV, we pre-selected the roles you’re most qualified for. Adjust anything — pick as many as fit.'
                    : 'Pick as many as fit. We’ll prioritise roles that match.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Suggested roles (matched to the CV) sort to the front. */}
                {[...ROLE_OPTIONS]
                  .sort((a, b) => (suggestedSet.has(b.key) ? 1 : 0) - (suggestedSet.has(a.key) ? 1 : 0))
                  .map(({ key, label }) => {
                  const active = roleTypes.includes(key);
                  const suggested = suggestedSet.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(setRoleTypes, key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all ${
                        active
                          ? 'bg-primary-light text-white border-primary-light'
                          : suggested
                            ? 'bg-primary-light/5 text-primary-dark border-primary-light/40'
                            : 'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'
                      }`}
                    >
                      {active ? <Check className="w-3.5 h-3.5" />
                        : suggested ? <Sparkles className="w-3.5 h-3.5" /> : null}
                      {label}
                    </button>
                  );
                })}

                {/* Custom roles the user typed in (stored verbatim) */}
                {roleTypes.filter((r) => !ROLE_KEYS.has(r)).map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 rounded-full pl-3.5 pr-2 py-2 text-sm font-medium bg-primary-light text-white border border-primary-light"
                  >
                    {roleLabel(r)}
                    <button
                      type="button"
                      onClick={() => removeValue(setRoleTypes, r)}
                      className="p-0.5 text-white/80 hover:text-white rounded-full transition-colors"
                      aria-label={`Remove ${r}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <ChipInput
                value={newRole}
                onChange={setNewRole}
                onAdd={addRole}
                placeholder="Looking for a specific niche?"
                addLabel="Add Role"
              />

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
                    // "Remote anywhere" is incompatible with onsite/hybrid roles.
                    const blocked = loc === REMOTE_ANYWHERE && PHYSICAL_ARRANGEMENTS.has(arrangement);
                    return (
                      <button
                        key={loc}
                        type="button"
                        disabled={blocked}
                        onClick={() => { if (!blocked) toggle(setLocations, loc); }}
                        title={blocked ? 'Not available for onsite or hybrid roles — pick a region.' : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all ${
                          blocked
                            ? 'bg-neutral text-secondary-dark/40 border-neutral-dark cursor-not-allowed line-through'
                            : active
                              ? 'bg-primary-light text-white border-primary-light'
                              : 'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'
                        }`}
                      >
                        {active && !blocked && <Check className="w-3.5 h-3.5" />}
                        {loc}
                      </button>
                    );
                  })}

                  {/* Custom countries the user typed in */}
                  {locations.filter((l) => !LOCATION_OPTIONS.includes(l)).map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1.5 rounded-full pl-3.5 pr-2 py-2 text-sm font-medium bg-primary-light text-white border border-primary-light"
                    >
                      {l}
                      <button
                        type="button"
                        onClick={() => removeValue(setLocations, l)}
                        className="p-0.5 text-white/80 hover:text-white rounded-full transition-colors"
                        aria-label={`Remove ${l}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {PHYSICAL_ARRANGEMENTS.has(arrangement) && (
                  <p className="mt-2 text-xs text-secondary-dark">
                    “Remote anywhere” isn’t available for {arrangement === 'onsite' ? 'onsite' : 'hybrid'} roles — choose a region or country.
                  </p>
                )}

                <div className="mt-2.5">
                  <ChipInput
                    value={newLocation}
                    onChange={setNewLocation}
                    onAdd={addLocation}
                    placeholder="Add a specific country"
                    addLabel="Add Country"
                  />
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
                        onClick={() => {
                          setArrangement(a.id);
                          // Picking a physical arrangement removes the now-invalid
                          // "Remote anywhere" location (Complete then requires a
                          // real region, since at least one location is mandatory).
                          if (PHYSICAL_ARRANGEMENTS.has(a.id)) {
                            setLocations((prev) => prev.filter((l) => l !== REMOTE_ANYWHERE));
                          }
                        }}
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
