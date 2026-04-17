import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Rocket, User, FileText, Briefcase, CheckCircle, ChevronRight, ChevronLeft, Upload, Plus, X, Loader2 } from 'lucide-react';
import { getProfile, createProfile, updateProfile, uploadCV, extractSkills } from '../services/apiBlog';
import { toast } from 'react-toastify';

const STEPS = [
  { label: 'Personal Info', icon: User },
  { label: 'Your CV',       icon: FileText },
  { label: 'Preferences',   icon: Briefcase },
  { label: 'Review',        icon: CheckCircle },
];

const EMPLOYMENT_TYPES = ['full-time', 'contract', 'both'];
const TONE_OPTIONS     = ['professional', 'casual', 'friendly'];

const defaultPrefs = {
  roles_open_to:    [],
  roles_to_exclude: '',
  min_salary:       '',
  employment_type:  'full-time',
  tone_preference:  'professional',
};

export default function Onboarding() {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const isEditMode       = searchParams.get('edit') === 'true';

  const [step, setStep]           = useState(1);
  const [profileExists, setProfileExists] = useState(false);
  const [cvMode, setCvMode]       = useState('paste');
  const [roleInput, setRoleInput] = useState('');
  const [saving, setSaving]       = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name:        '',
    location:         '',
    phone:            '',
    linkedin_url:     '',
    github_url:       '',
    portfolio_url:    '',
    cv_raw_text:      '',
    skills_extracted: {},
    job_preferences:  { ...defaultPrefs },
  });

  // Load existing profile on mount
  useEffect(() => {
    getProfile().then(profile => {
      if (!profile) return;
      setProfileExists(true);
      setForm({
        full_name:        profile.full_name        || '',
        location:         profile.location         || '',
        phone:            profile.phone            || '',
        linkedin_url:     profile.linkedin_url     || '',
        github_url:       profile.github_url       || '',
        portfolio_url:    profile.portfolio_url    || '',
        cv_raw_text:      profile.cv_raw_text      || '',
        skills_extracted: profile.skills_extracted || {},
        job_preferences: {
          ...defaultPrefs,
          ...(profile.job_preferences || {}),
        },
      });
    }).catch(() => {});
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const setPref = (field, value) =>
    setForm(f => ({ ...f, job_preferences: { ...f.job_preferences, [field]: value } }));

  const addRole = () => {
    const val = roleInput.trim();
    if (!val) return;
    if (form.job_preferences.roles_open_to.includes(val)) { setRoleInput(''); return; }
    setPref('roles_open_to', [...form.job_preferences.roles_open_to, val]);
    setRoleInput('');
  };

  const removeRole = (role) =>
    setPref('roles_open_to', form.job_preferences.roles_open_to.filter(r => r !== role));

  // ── save current step to backend ─────────────────────────────────────────

  const saveProgress = async (extra = {}) => {
    const payload = {
      full_name:        form.full_name,
      location:         form.location,
      phone:            form.phone,
      linkedin_url:     form.linkedin_url,
      github_url:       form.github_url,
      portfolio_url:    form.portfolio_url,
      cv_raw_text:      form.cv_raw_text,
      skills_extracted: form.skills_extracted,
      job_preferences:  form.job_preferences,
      ...extra,
    };
    if (profileExists) {
      return updateProfile(payload);
    } else {
      const created = await createProfile(payload);
      setProfileExists(true);
      return created;
    }
  };

  // ── step navigation ───────────────────────────────────────────────────────

  const handleNext = async () => {
    if (step === 1 && !form.full_name.trim()) {
      toast.error('Full name is required'); return;
    }
    setSaving(true);
    try {
      await saveProgress();
      setStep(s => s + 1);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await saveProgress({ onboarding_complete: true });
      toast.success('Profile complete!');
      navigate(isEditMode ? '/dashboard/profile' : '/dashboard');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── CV upload ─────────────────────────────────────────────────────────────

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (!profileExists) await saveProgress();
      const fd = new FormData();
      fd.append('cv', file);
      await uploadCV(fd);
      const updated = await getProfile();
      set('cv_raw_text', updated?.cv_raw_text || '');
      toast.success('PDF extracted successfully');
    } catch {
      toast.error('PDF extraction failed');
    } finally {
      setUploading(false);
    }
  };

  // ── AI skill extraction ───────────────────────────────────────────────────

  const handleExtractSkills = async () => {
    if (!form.cv_raw_text.trim()) { toast.error('Paste or upload your CV first'); return; }
    setExtracting(true);
    try {
      if (!profileExists) await saveProgress();
      else await updateProfile({ cv_raw_text: form.cv_raw_text });
      const result = await extractSkills();
      set('skills_extracted', result.extracted || {});
      toast.success('Skills extracted!');
    } catch {
      toast.error('Extraction failed. Try again.');
    } finally {
      setExtracting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  const skills       = form.skills_extracted?.skills         || [];
  const strongest    = form.skills_extracted?.strongest_areas || [];
  const fitTitles    = form.skills_extracted?.job_titles_fit  || [];
  const hasSkills    = skills.length > 0 || strongest.length > 0;

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

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-sm text-gray-500">Tell us a bit about yourself so we can personalise your outreach.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name *" value={form.full_name} onChange={v => set('full_name', v)} placeholder="Joshua Atoyebi" />
                <Field label="Location"    value={form.location}  onChange={v => set('location', v)}  placeholder="Lagos, Nigeria" />
                <Field label="Phone"       value={form.phone}     onChange={v => set('phone', v)}     placeholder="+234 800 000 0000" />
                <Field label="LinkedIn URL" value={form.linkedin_url} onChange={v => set('linkedin_url', v)} placeholder="linkedin.com/in/yourname" />
                <Field label="GitHub URL"   value={form.github_url}   onChange={v => set('github_url', v)}   placeholder="github.com/yourname" />
                <Field label="Portfolio URL" value={form.portfolio_url} onChange={v => set('portfolio_url', v)} placeholder="yoursite.com" />
              </div>
            </>
          )}

          {/* ── STEP 2: CV ── */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Your CV</h2>
              <p className="text-sm text-gray-500">Upload a PDF or paste your CV text. We'll extract your skills with AI.</p>

              {/* Mode toggle */}
              <div className="flex gap-2">
                {['paste', 'upload'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setCvMode(mode)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      cvMode === mode
                        ? 'bg-primary-light/10 text-primary-dark border-primary-light/30'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {mode === 'paste' ? 'Paste Text' : 'Upload PDF'}
                  </button>
                ))}
              </div>

              {cvMode === 'paste' ? (
                <textarea
                  className="w-full h-48 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10"
                  placeholder="Paste your full CV / resume text here..."
                  value={form.cv_raw_text}
                  onChange={e => set('cv_raw_text', e.target.value)}
                />
              ) : (
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  uploading ? 'border-primary-light/40 bg-primary-light/5' : 'border-gray-200 hover:border-primary-light/40 hover:bg-primary-light/5'
                }`}>
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-primary-light animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500 font-medium">Click to upload PDF</span>
                      <span className="text-xs text-gray-400 mt-1">Text will be extracted automatically</span>
                    </>
                  )}
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                </label>
              )}

              {form.cv_raw_text && (
                <p className="text-xs text-emerald-600 font-medium">
                  {form.cv_raw_text.length.toLocaleString()} characters loaded
                </p>
              )}

              <button
                onClick={handleExtractSkills}
                disabled={extracting || !form.cv_raw_text.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {extracting ? 'Extracting…' : 'Extract Skills with AI'}
              </button>

              {hasSkills && (
                <div className="space-y-3 pt-2">
                  {skills.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {skills.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {strongest.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strongest Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {strongest.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {fitTitles.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Best Fit Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {fitTitles.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-orange-50 text-primary-dark text-xs font-semibold rounded-full border border-orange-100">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── STEP 3: Job Preferences ── */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Job Preferences</h2>
              <p className="text-sm text-gray-500">Help us match and score jobs more accurately for you.</p>

              {/* Roles open to */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Roles You're Open To</label>
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10"
                    placeholder="e.g. Backend Developer"
                    value={roleInput}
                    onChange={e => setRoleInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRole())}
                  />
                  <button
                    onClick={addRole}
                    className="px-3 py-2 bg-primary-light/10 text-primary-dark rounded-xl hover:bg-primary-light/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.job_preferences.roles_open_to.map(role => (
                    <span key={role} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-light/10 text-primary-dark text-xs font-semibold rounded-full">
                      {role}
                      <button onClick={() => removeRole(role)} className="hover:text-primary-dark/60"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              <Field
                label="Roles to Exclude"
                value={form.job_preferences.roles_to_exclude}
                onChange={v => setPref('roles_to_exclude', v)}
                placeholder="e.g. QA Engineer, Manager"
              />
              <Field
                label="Minimum Salary Expectation"
                value={form.job_preferences.min_salary}
                onChange={v => setPref('min_salary', v)}
                placeholder="e.g. $80,000 or £60k"
              />

              {/* Employment type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Type</label>
                <div className="flex gap-2">
                  {EMPLOYMENT_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setPref('employment_type', t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize border transition-all ${
                        form.job_preferences.employment_type === t
                          ? 'bg-primary-light/10 text-primary-dark border-primary-light/30'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone preference */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Outreach Tone</label>
                <div className="flex gap-2">
                  {TONE_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => setPref('tone_preference', t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize border transition-all ${
                        form.job_preferences.tone_preference === t
                          ? 'bg-primary-light/10 text-primary-dark border-primary-light/30'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 4: Review ── */}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Review & Complete</h2>
              <p className="text-sm text-gray-500">Everything looks good? Hit complete to start using OutreachOS.</p>

              <div className="space-y-4">
                <ReviewSection title="Personal Info">
                  <ReviewRow label="Name"      value={form.full_name} />
                  <ReviewRow label="Location"  value={form.location} />
                  <ReviewRow label="Phone"     value={form.phone} />
                  <ReviewRow label="LinkedIn"  value={form.linkedin_url} />
                  <ReviewRow label="GitHub"    value={form.github_url} />
                  <ReviewRow label="Portfolio" value={form.portfolio_url} />
                </ReviewSection>

                <ReviewSection title="CV">
                  <ReviewRow
                    label="Text loaded"
                    value={form.cv_raw_text ? `${form.cv_raw_text.length.toLocaleString()} characters` : 'None'}
                  />
                  <ReviewRow
                    label="Skills extracted"
                    value={skills.length > 0 ? `${skills.length} skills` : 'Not yet extracted'}
                  />
                </ReviewSection>

                <ReviewSection title="Job Preferences">
                  <ReviewRow label="Open to"       value={form.job_preferences.roles_open_to.join(', ') || '—'} />
                  <ReviewRow label="Excluding"      value={form.job_preferences.roles_to_exclude || '—'} />
                  <ReviewRow label="Min salary"     value={form.job_preferences.min_salary || '—'} />
                  <ReviewRow label="Employment"     value={form.job_preferences.employment_type} />
                  <ReviewRow label="Outreach tone"  value={form.job_preferences.tone_preference} />
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
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition-all shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition-all shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-primary-light/50 focus:ring-2 focus:ring-primary-light/10 transition-all"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

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
