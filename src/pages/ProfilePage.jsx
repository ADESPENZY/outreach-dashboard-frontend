import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  User, MapPin, Phone, Mail, Linkedin, Github, Globe, Calendar,
  FileText, Pencil, Loader2, ChevronDown, ChevronUp, Download,
  Plus, X, Save, Sparkles, Upload,
} from 'lucide-react';
import { getProfile, updateProfile, uploadCV } from '../services/apiProfile';
import api from '../api';

const TONES = ['professional', 'warm', 'direct'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [form, setForm]             = useState(null);
  const [saving, setSaving]         = useState(false);
  const [cvExpanded, setCvExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);

  useEffect(() => {
    getProfile().then(p => setProfile(p)).finally(() => setLoading(false));
  }, []);

  // Upload (or replace) the CV PDF → extract skills/projects → refresh profile.
  // This is the home for CV upload now that the onboarding wizard is gone.
  const handleCvUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error('Please upload a PDF.');
    setCvBusy(true);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      await uploadCV(fd);
      // The backend extracts skills + projects in a background thread; give it a
      // moment, then poll the profile until the fresh extraction lands.
      toast.info('CV uploaded — extracting your skills & projects… (~10s)');
      let fresh = null;
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 2500));
        fresh = await getProfile();
        setProfile(fresh);
      }
      toast.success('CV processed — skills & project highlights updated.');
    } catch (err) {
      toast.error('CV upload failed: ' + err.message);
    } finally {
      setCvBusy(false);
    }
  };

  const startEdit = () => {
    setForm({
      full_name: '', location: '', phone: '', contact_email: '',
      linkedin_url: '', github_url: '', portfolio_url: '', calendly_url: '',
      experience_summary: '',
      ...profile,
      project_highlights: [...(profile.project_highlights || [])],
      job_preferences: { ...(profile.job_preferences || {}) },
    });
    setEditing(true);
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPref  = (k, v) => setForm(f => ({ ...f, job_preferences: { ...f.job_preferences, [k]: v } }));
  const setProject    = (i, v) => setForm(f => { const p = [...f.project_highlights]; p[i] = v; return { ...f, project_highlights: p }; });
  const addProject    = () => setForm(f => ({ ...f, project_highlights: [...f.project_highlights, ''] }));
  const removeProject = (i) => setForm(f => ({ ...f, project_highlights: f.project_highlights.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name, location: form.location, phone: form.phone,
        contact_email: form.contact_email, linkedin_url: form.linkedin_url,
        github_url: form.github_url, portfolio_url: form.portfolio_url,
        calendly_url: form.calendly_url, experience_summary: form.experience_summary,
        project_highlights: (form.project_highlights || []).map(p => p.trim()).filter(Boolean),
        job_preferences: form.job_preferences,
      };
      const updated = await updateProfile(payload);
      setProfile(updated);
      setEditing(false);
      toast.success('Profile saved — your emails will use it from now on.');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/api/accounts/profile/resume-pdf/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${profile?.full_name?.replace(/\s+/g, '_') || 'resume'}_resume.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      toast.error('Could not generate the PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-light animate-spin" /></div>;
  }
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-secondary-dark text-sm">No profile found.</p>
        <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-gradient-to-r from-primary-dark to-primary-light text-white text-sm font-semibold rounded-xl">Go to Dashboard</button>
      </div>
    );
  }

  const view = editing ? form : profile;
  const skills    = profile.skills_extracted?.skills          || [];
  const strongest = profile.skills_extracted?.strongest_areas || [];
  const fitTitles = profile.skills_extracted?.job_titles_fit  || [];
  const projects  = view.project_highlights || [];
  const sigLink   = view.calendly_url || view.portfolio_url || '';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Header / identity ── */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light/20 to-primary-dark/20 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-primary-dark" />
            </div>
            <div className="min-w-0">
              {editing
                ? <input value={view.full_name || ''} onChange={e => setField('full_name', e.target.value)} placeholder="Your full name" className="text-xl font-bold text-black font-montserrat bg-neutral rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-light/30 w-full" />
                : <h1 className="text-xl font-bold text-black font-montserrat">{profile.full_name || 'Your Name'}</h1>}
              {!editing && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {profile.location && <InfoChip icon={MapPin}>{profile.location}</InfoChip>}
                  {profile.phone && <InfoChip icon={Phone}>{profile.phone}</InfoChip>}
                  {profile.contact_email && <InfoChip icon={Mail}>{profile.contact_email}</InfoChip>}
                </div>
              )}
              {!editing && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {profile.linkedin_url && <LinkChip icon={Linkedin} url={profile.linkedin_url}>LinkedIn</LinkChip>}
                  {profile.github_url && <LinkChip icon={Github} url={profile.github_url}>GitHub</LinkChip>}
                  {profile.portfolio_url && <LinkChip icon={Globe} url={profile.portfolio_url}>Portfolio</LinkChip>}
                  {profile.calendly_url && <LinkChip icon={Calendar} url={profile.calendly_url}>Calendly</LinkChip>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-semibold text-secondary-dark bg-neutral rounded-xl hover:bg-neutral-dark transition-all">Cancel</button>
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
              </>
            ) : (
              <>
                <button onClick={handleDownloadPdf} disabled={downloading} className="flex items-center gap-2 px-4 py-2 bg-neutral text-secondary-dark text-sm font-semibold rounded-xl hover:bg-neutral-dark transition-all disabled:opacity-60">
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                </button>
                <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-primary-light/10 text-primary-dark text-sm font-semibold rounded-xl hover:bg-primary-light/20 transition-all">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editable contact + links */}
        {editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <Field label="Location" icon={MapPin} value={view.location} onChange={v => setField('location', v)} placeholder="City, Country" />
            <Field label="Phone" icon={Phone} value={view.phone} onChange={v => setField('phone', v)} placeholder="+1 555 000 0000" />
            <Field label="Sign-off email" icon={Mail} value={view.contact_email} onChange={v => setField('contact_email', v)} placeholder="Defaults to your account email" hint="The address shown at the bottom of every cold email." />
            <Field label="LinkedIn" icon={Linkedin} value={view.linkedin_url} onChange={v => setField('linkedin_url', v)} placeholder="linkedin.com/in/…" />
            <Field label="GitHub" icon={Github} value={view.github_url} onChange={v => setField('github_url', v)} placeholder="github.com/…" />
            <Field label="Portfolio" icon={Globe} value={view.portfolio_url} onChange={v => setField('portfolio_url', v)} placeholder="yoursite.com" />
            <div className="sm:col-span-2">
              <Field label="Calendly / booking link (optional)" icon={Calendar} value={view.calendly_url} onChange={v => setField('calendly_url', v)} placeholder="calendly.com/you/30min" />
              <p className="text-[11px] text-secondary-dark/70 mt-1">
                Optional — emails still send without it. Don't have one?{' '}
                <a href="https://calendly.com/signup" target="_blank" rel="noreferrer" className="text-primary-dark font-semibold hover:underline">Create a free Calendly →</a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Email signature preview ── */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6">
        <h2 className="text-sm font-bold text-secondary-dark/60 uppercase tracking-widest mb-3">How your emails sign off</h2>
        <div className="bg-neutral rounded-xl p-4 text-sm text-secondary-dark font-mono whitespace-pre-wrap border border-neutral-dark">
          {`Warm regards,\n`}
          <span className="text-black font-semibold">{view.full_name || 'Your Name'}</span>{`\n`}
          <span className="text-black">{view.contact_email || '(your account email)'}</span>
          {sigLink ? <>{`\n`}<span className="text-primary-dark">{sigLink}</span></> : null}
        </div>
        {!sigLink && (
          <p className="text-[11px] text-secondary-dark/60 mt-2">No booking link set — add a Calendly above and every email gets a one-click "book a call".</p>
        )}
      </div>

      {/* ── Outreach personalisation: projects + summary + tone ── */}
      <Section title="Outreach Voice — used to write your cold emails">
        <p className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-2">Project Highlights</p>
        <p className="text-[11px] text-secondary-dark/70 mb-3">
          Auto-drafted from your CV. These are woven into the body of your cold emails — keep the strongest 3–5.
        </p>
        {editing ? (
          <div className="space-y-2">
            {projects.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <textarea value={p} onChange={e => setProject(i, e.target.value)} rows={2}
                  placeholder="ProjectName: what you built + the technical challenge you solved + the stack"
                  className="flex-1 text-sm bg-neutral border border-neutral-dark rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-light/30 resize-none" />
                <button onClick={() => removeProject(i)} className="mt-1.5 text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={addProject} className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark hover:text-primary-light mt-1">
              <Plus className="w-3.5 h-3.5" /> Add project
            </button>
          </div>
        ) : projects.length > 0 ? (
          <ul className="space-y-2">
            {projects.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-secondary-dark">
                <Sparkles className="w-3.5 h-3.5 text-primary-light mt-1 shrink-0" /><span>{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-secondary-dark/50">None yet — upload your CV and we'll draft these, or click Edit to add them.</p>
        )}

        <div className="mt-5">
          <p className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-2">Experience Summary</p>
          {editing
            ? <textarea value={view.experience_summary || ''} onChange={e => setField('experience_summary', e.target.value)} rows={3}
                placeholder="2–3 sentences on who you are and what you do." className="w-full text-sm bg-neutral border border-neutral-dark rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-light/30 resize-none" />
            : <p className="text-sm text-secondary-dark">{profile.experience_summary || <span className="text-secondary-dark/50">Auto-drafted from your CV on upload.</span>}</p>}
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-2">Default Outreach Tone</p>
          {editing ? (
            <div className="flex gap-2">
              {TONES.map(t => (
                <button key={t} onClick={() => setPref('tone_preference', t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border capitalize transition-all ${
                    (view.job_preferences?.tone_preference || 'professional') === t
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-secondary-dark border-neutral-dark hover:bg-neutral'}`}>{t}</button>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-black-light capitalize">{profile.job_preferences?.tone_preference || 'professional'}</p>
          )}
        </div>
      </Section>

      {/* ── Extracted skills (read-only) ── */}
      {(skills.length > 0 || strongest.length > 0 || fitTitles.length > 0) && (
        <Section title="Extracted Skills">
          {skills.length > 0 && <TagGroup label="Skills" tags={skills} color="blue" />}
          {strongest.length > 0 && <TagGroup label="Strongest Areas" tags={strongest} color="emerald" />}
          {fitTitles.length > 0 && <TagGroup label="Best Fit Roles" tags={fitTitles} color="orange" />}
          {profile.skills_extracted?.years_experience && (
            <p className="text-sm text-secondary-dark mt-2"><span className="font-semibold text-black-light">{profile.skills_extracted.years_experience}</span> years of experience</p>
          )}
        </Section>
      )}

      {/* ── CV / Resume — upload, replace, view (the home for CV upload now) ── */}
      <Section title="CV / Resume">
        <input type="file" accept="application/pdf" id="cv-upload" className="hidden"
          onChange={e => { handleCvUpload(e.target.files?.[0]); e.target.value = ''; }} />
        {profile.cv_raw_text ? (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <FileText className="w-4 h-4 text-secondary-dark/60" />
              <span className="text-xs text-secondary-dark">{profile.cv_raw_text.length.toLocaleString()} characters</span>
              <label htmlFor="cv-upload" className={`ml-auto flex items-center gap-1.5 text-xs font-semibold ${cvBusy ? 'text-secondary-dark/50 cursor-default' : 'text-primary-dark hover:text-primary-light cursor-pointer'}`}>
                {cvBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {cvBusy ? 'Processing…' : 'Replace CV'}
              </label>
              <button onClick={() => setCvExpanded(v => !v)} className="flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary-light transition-colors">
                {cvExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand</>}
              </button>
            </div>
            <div className={`bg-neutral rounded-xl p-4 text-xs text-secondary-dark leading-relaxed whitespace-pre-wrap font-mono overflow-auto transition-all ${cvExpanded ? 'max-h-none' : 'max-h-40'}`}>
              {profile.cv_raw_text}
            </div>
          </>
        ) : (
          <label htmlFor="cv-upload" className={`block ${cvBusy ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="border-2 border-dashed border-neutral-dark rounded-xl py-10 text-center hover:border-primary-light/50 transition-all">
              {cvBusy ? <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary-light" /> : <Upload className="w-6 h-6 mx-auto text-secondary-dark/40" />}
              <p className="text-sm font-semibold text-black mt-2">{cvBusy ? 'Processing your CV…' : 'Upload your CV (PDF)'}</p>
              <p className="text-xs text-secondary-dark mt-0.5">We extract your skills & project highlights automatically.</p>
            </div>
          </label>
        )}
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-6">
      <h2 className="text-sm font-bold text-secondary-dark/60 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider mb-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm bg-neutral border border-neutral-dark rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-light/30" />
      {hint && <p className="text-[11px] text-secondary-dark/60 mt-1">{hint}</p>}
    </div>
  );
}

function InfoChip({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-secondary-dark">
      <Icon className="w-3.5 h-3.5" />{children}
    </span>
  );
}

function LinkChip({ icon: Icon, url, children }) {
  const href = url.startsWith('http') ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline">
      <Icon className="w-3.5 h-3.5" />{children}
    </a>
  );
}

function TagGroup({ label, tags, color }) {
  const colorMap = {
    blue:    'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    orange:  'bg-orange-50 text-primary-dark border-orange-100',
  };
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-secondary-dark/60 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${colorMap[color]}`}>{tag}</span>
        ))}
      </div>
    </div>
  );
}
