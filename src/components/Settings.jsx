import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Mail, Briefcase, SlidersHorizontal, ChevronDown, Lock, Save,
  FileText, Upload, Sparkles, Plus, X,
  Bell, Clock, KeyRound, AtSign, LogOut, Trash2, AlertTriangle, ShieldCheck,
  Crown, Flame, CheckCircle2, Send, Download, Info, ArrowRight, HeartHandshake,
} from 'lucide-react';
import { ApplyDirLoader } from '@/components/ui/ApplyDirLoader';
import { getMe, changePassword, deleteAccount, forgotPassword, setUsername } from '@/services/apiAuth';
import { getProfile, updateProfile, uploadCV } from '@/services/apiProfile';
import { getAutoScoutSettings, updateAutoScoutSettings } from '@/services/apiSettings';
import { getInboxStats } from '@/services/apiInboxes';
import { deleteGmailAccount, toggleGmailAccount, getGmailOAuthUrl } from '@/services/apiGmail';
import { useAuth } from '@/context/AuthContext';
import { enablePush, disablePush, isPushEnabled, pushAvailableHere, sendTestPush, isIOS, isStandalone, pushFailureMessage } from '@/services/push';
import { LegalSections } from '@/components/legal/PolicyContent';
import api from '@/api';
import PendingActivationCard from './PendingActivationCard';
import KeywordSuggestions from './KeywordSuggestions';

// ═══════════════════════════════════════════════════════════════════════════
// Tabs
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'profile',  label: 'Profile',        icon: User,             desc: 'You & your CV' },
  { key: 'sending',  label: 'Email & Sending', icon: Mail,            desc: 'Inboxes & follow-ups' },
  { key: 'jobs',     label: 'Job Preferences', icon: Briefcase,       desc: 'What to search for' },
  { key: 'account',  label: 'Account',         icon: SlidersHorizontal, desc: 'Login & billing' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Shared primitives (Design Guide compliant)
// ═══════════════════════════════════════════════════════════════════════════
function Collapsible({ title, description, icon, defaultOpen = false, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 md:px-6 py-4 md:py-5 text-left hover:bg-neutral/40 transition-colors"
      >
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
            {React.createElement(icon, { className: 'w-4 h-4 text-primary-dark' })}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-bold font-montserrat text-black truncate">{title}</h3>
            {badge}
          </div>
          {description && <p className="text-xs md:text-sm text-secondary-dark mt-0.5">{description}</p>}
        </div>
        <ChevronDown className={`w-5 h-5 text-secondary-dark/60 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 md:px-6 pb-5 md:pb-6 pt-1 space-y-4 border-t border-neutral-dark">{children}</div>}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all disabled:bg-neutral disabled:text-secondary-dark ${props.className || ''}`}
    />
  );
}

function Label({ children }) {
  return <label className="block text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider mb-1">{children}</label>;
}

function SaveButton({ onClick, saving, disabled, children = 'Save', className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold font-montserrat rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {saving ? <ApplyDirLoader.Button variant="light" /> : <Save className="w-4 h-4" />} {children}
    </button>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50 ${checked ? 'bg-primary-light' : 'bg-neutral-dark'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function ToggleRow({ icon, title, desc, checked, onChange, saving }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">{React.createElement(icon, { className: 'w-4 h-4 text-primary-dark' })}</div>}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-black">{title}</p>
          <p className="text-xs text-secondary-dark">{desc}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={saving} />
    </div>
  );
}

// Editable chip list — type + Enter to add, click × to remove.
function Chips({ value = [], onChange, placeholder, pill = 'bg-primary-light/10 text-primary-dark border-primary-light/20' }) {
  const [text, setText] = useState('');
  const add = (raw) => {
    const items = raw.split(',').map(t => t.trim()).filter(Boolean);
    onChange([...new Set([...value, ...items.filter(t => !value.includes(t))])]);
    setText('');
  };
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-neutral-dark bg-white min-h-[52px] focus-within:border-primary-light focus-within:ring-2 focus-within:ring-primary-light/20 transition-all">
      {value.map(tag => (
        <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${pill}`}>
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="hover:opacity-60 ml-0.5"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (text.trim()) add(text); }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text.trim() && add(text)}
        placeholder={value.length === 0 ? placeholder : 'Add more…'}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent text-black placeholder:text-secondary-dark/50"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = params.get('tab');
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.key === tabFromUrl) ? tabFromUrl : 'profile');

  const selectTab = (key) => { setActiveTab(key); setParams(key === 'profile' ? {} : { tab: key }, { replace: true }); };

  return (
    // Same page frame as Opportunities so the padding + edges line up across
    // the app: p-4 md:p-8, max-w-[1400px] mx-auto, space-y-6.
    <div className="relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">Settings</h1>
        <p className="text-sm text-secondary-dark mt-1">Everything about your account — profile, sending, job search, and login.</p>
      </div>

      {/* Sub-nav rail (screenshot inspo): horizontal scroll on mobile, a sticky
          vertical rail on desktop, with the wide content panel beside it. */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-60 shrink-0 md:sticky md:top-6">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 md:pb-0 md:mx-0 md:px-0">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => selectTab(tab.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold whitespace-nowrap transition-all shrink-0 md:w-full ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-light to-primary-dark text-white shadow-sm'
                      : 'bg-white border border-neutral-dark text-secondary-dark hover:text-black-light hover:border-primary-light/40'
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate">{tab.label}</span>
                    <span className={`hidden md:block text-[11px] font-normal ${isActive ? 'text-white/80' : 'text-secondary-dark/60'}`}>{tab.desc}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-5 md:max-w-3xl">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'sending' && <SendingTab />}
          {activeTab === 'jobs'    && <JobsTab />}
          {activeTab === 'account' && <AccountTab navigate={navigate} />}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — PROFILE
// ═══════════════════════════════════════════════════════════════════════════
const TONES = [
  { id: 'direct',       label: 'Direct and confident' },
  { id: 'warm',         label: 'Warm and human' },
  { id: 'professional', label: 'Professional and sharp' },
];
const DIFFERENTIATORS = [
  'Built and shipped my own products', 'Strong across time zones', 'Fast learner with new stacks',
  'Strong communicator and documenter', 'Non-traditional background', 'Deep domain expertise',
];
const SECRET_MAX = 200;

function ProfileTab() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  // Identity form
  const [idForm, setIdForm] = useState(null);
  const [savingId, setSavingId] = useState(false);
  // Voice form (summary + tone + secret weapon + differentiators)
  const [summary, setSummary] = useState('');
  const [tone, setTone] = useState('professional');
  const [secret, setSecret] = useState('');
  const [diffs, setDiffs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setIdForm({
      full_name: profile.full_name || '', location: profile.location || '',
      phone: profile.phone || '', github_url: profile.github_url || '',
      linkedin_url: profile.linkedin_url || '', portfolio_url: profile.portfolio_url || '',
      calendly_url: profile.calendly_url || '', contact_email: profile.contact_email || '',
    });
    setSummary(profile.experience_summary || '');
    setTone(profile.job_preferences?.tone_preference || profile.tone_preference || 'professional');
    setSecret(profile.secret_weapon || '');
    setDiffs(profile.differentiators || []);
    setProjects(profile.project_highlights || []);
  }, [profile]);

  const saveIdentity = async () => {
    setSavingId(true);
    try {
      await updateProfile(idForm);
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Saved ✓');
    } catch (e) { toast.error(e.message); } finally { setSavingId(false); }
  };

  const saveVoice = async () => {
    setSavingVoice(true);
    try {
      await updateProfile({
        experience_summary: summary,
        tone_preference: tone,
        secret_weapon: secret.trim(),
        differentiators: diffs,
        project_highlights: projects.map(p => p.trim()).filter(Boolean),
      });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Saved ✓');
    } catch (e) { toast.error(e.message); } finally { setSavingVoice(false); }
  };

  const handleCv = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error('Please upload a PDF.');
    setCvBusy(true);
    try {
      const fd = new FormData(); fd.append('cv', file);
      await uploadCV(fd);
      toast.info('CV uploaded — extracting skills & projects… (~10s)');
      for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 2500)); await qc.invalidateQueries({ queryKey: ['profile'] }); }
      toast.success('CV processed — skills & projects updated.');
    } catch (e) { toast.error('CV upload failed: ' + e.message); } finally { setCvBusy(false); }
  };

  const toggleDiff = (d) => setDiffs(prev => prev.includes(d) ? prev.filter(x => x !== d) : (prev.length >= 2 ? prev : [...prev, d]));
  const setProject = (i, v) => setProjects(p => { const n = [...p]; n[i] = v; return n; });

  const downloadResumePdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await api.get('/api/accounts/profile/resume-pdf/', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${(profile?.full_name || 'resume').replace(/\s+/g, '_')}_resume.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { toast.error('Could not generate the PDF.'); } finally { setDownloadingPdf(false); }
  };

  if (isLoading || !idForm) return <ApplyDirLoader.Inline />;
  const skills = profile?.skills_extracted?.skills || [];
  const strongest = profile?.skills_extracted?.strongest_areas || [];
  const fitTitles = profile?.skills_extracted?.job_titles_fit || [];
  const displayName = idForm.full_name || me?.first_name || me?.username || 'You';
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  return (
    <>
      {/* Identity header (screenshot inspo) — avatar + name + email */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-dark shadow-sm px-5 md:px-6 py-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center text-white text-xl font-bold font-montserrat shadow-lg shadow-primary-light/30 shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-black font-montserrat truncate">{displayName}</p>
          <p className="text-sm text-secondary-dark truncate">{me?.email}</p>
        </div>
      </div>

      {/* Section A — Identity */}
      <Collapsible title="Your Identity" description="Name, location, and the links in your email sign-off." icon={User} defaultOpen>
        <div>
          <Label>Full name</Label>
          <Input value={idForm.full_name} onChange={e => setIdForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" />
        </div>
        <div>
          <Label>Email address</Label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-secondary-dark/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={me?.email || ''} disabled className="pl-9" />
          </div>
          <p className="text-[11px] text-secondary-dark/60 mt-1">Your login email can't be changed here.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Location / mailing address</Label><Input value={idForm.location} onChange={e => setIdForm(f => ({ ...f, location: e.target.value }))} placeholder="Lagos, Nigeria" /></div>
          <div><Label>Phone</Label><Input value={idForm.phone} onChange={e => setIdForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" /></div>
          <div><Label>Sign-off email</Label><Input value={idForm.contact_email} onChange={e => setIdForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="Defaults to account email" /></div>
          <div><Label>LinkedIn URL</Label><Input value={idForm.linkedin_url} onChange={e => setIdForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="linkedin.com/in/…" /></div>
          <div><Label>GitHub URL</Label><Input value={idForm.github_url} onChange={e => setIdForm(f => ({ ...f, github_url: e.target.value }))} placeholder="github.com/…" /></div>
          <div><Label>Portfolio / website</Label><Input value={idForm.portfolio_url} onChange={e => setIdForm(f => ({ ...f, portfolio_url: e.target.value }))} placeholder="yoursite.com" /></div>
          <div className="sm:col-span-2"><Label>Calendly link (optional)</Label><Input value={idForm.calendly_url} onChange={e => setIdForm(f => ({ ...f, calendly_url: e.target.value }))} placeholder="calendly.com/you/30min" /></div>
        </div>
        <div className="flex justify-end"><SaveButton onClick={saveIdentity} saving={savingId} /></div>
      </Collapsible>

      {/* Section B — CV */}
      <Collapsible title="Your CV" description="Powers job scoring, your tailored CVs, and your email voice." icon={FileText}>
        <input type="file" accept="application/pdf" id="settings-cv" className="hidden" onChange={e => { handleCv(e.target.files?.[0]); e.target.value = ''; }} />
        {profile?.cv_raw_text ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> CV uploaded</span>
            <span className="text-xs text-secondary-dark">{profile.cv_raw_text.length.toLocaleString()} characters</span>
            <label htmlFor="settings-cv" className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold ${cvBusy ? 'text-secondary-dark/50' : 'text-primary-dark hover:text-primary-light cursor-pointer'}`}>
              {cvBusy ? <ApplyDirLoader.Button variant="dark" /> : <Upload className="w-3.5 h-3.5" />} {cvBusy ? 'Processing…' : 'Replace CV'}
            </label>
            <button onClick={downloadResumePdf} disabled={downloadingPdf} className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-dark hover:text-black-light disabled:opacity-50">
              {downloadingPdf ? <ApplyDirLoader.Button variant="dark" /> : <Download className="w-3.5 h-3.5" />} Résumé PDF
            </button>
          </div>
        ) : (
          <label htmlFor="settings-cv" className="block cursor-pointer">
            <div className="border-2 border-dashed border-neutral-dark rounded-xl py-8 text-center hover:border-primary-light/50 transition-all">
              {cvBusy ? <ApplyDirLoader.Inline size="sm" /> : <Upload className="w-6 h-6 mx-auto text-secondary-dark/40" />}
              <p className="text-sm font-semibold text-black mt-2">{cvBusy ? 'Processing your CV…' : 'Upload your CV (PDF)'}</p>
              <p className="text-xs text-secondary-dark mt-0.5">We extract your skills & project highlights automatically.</p>
            </div>
          </label>
        )}
        {(skills.length > 0 || strongest.length > 0 || fitTitles.length > 0) && (
          <div className="space-y-3 pt-1">
            {skills.length > 0 && <TagGroup label="Skills" tags={skills} cls="bg-blue-50 text-blue-700 border-blue-100" />}
            {strongest.length > 0 && <TagGroup label="Strongest areas" tags={strongest} cls="bg-emerald-50 text-emerald-700 border-emerald-100" />}
            {fitTitles.length > 0 && <TagGroup label="Best-fit roles" tags={fitTitles} cls="bg-orange-50 text-primary-dark border-orange-100" />}
            <p className="text-[11px] text-secondary-dark/60">Skills are re-extracted automatically each time you replace your CV.</p>
          </div>
        )}
      </Collapsible>

      {/* Section C+D — Voice: summary, projects, secret weapon, differentiators, tone */}
      <Collapsible title="Your Outreach Voice" description="Your summary, secret weapon, and tone — used to write every cold email." icon={Sparkles}>
        <div>
          <Label>Your one-line summary</Label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
            placeholder="Full-stack engineer specializing in backend systems and API architecture"
            className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 resize-none" />
        </div>

        <div>
          <Label>Project highlights</Label>
          <div className="space-y-2">
            {projects.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <textarea value={p} onChange={e => setProject(i, e.target.value)} rows={2}
                  placeholder="ProjectName: what you built + the challenge you solved + the stack"
                  className="flex-1 text-sm bg-white border border-neutral-dark rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light resize-none" />
                <button onClick={() => setProjects(projects.filter((_, x) => x !== i))} className="mt-1.5 text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setProjects([...projects, ''])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark hover:text-primary-light"><Plus className="w-3.5 h-3.5" /> Add project</button>
          </div>
        </div>

        <div>
          <Label>Your secret weapon</Label>
          <p className="text-xs text-secondary-dark mb-1.5">What's one thing you bring that isn't on your CV?</p>
          <textarea value={secret} onChange={e => setSecret(e.target.value.slice(0, SECRET_MAX))} rows={2}
            placeholder="I think in systems, not just code. I ask why before I ask how."
            className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 resize-none" />
          <p className="text-[11px] text-secondary-dark/60 text-right mt-1">{secret.length}/{SECRET_MAX}</p>
        </div>

        <div>
          <Label>What makes you stand out? (pick up to 2)</Label>
          <div className="flex flex-wrap gap-2">
            {DIFFERENTIATORS.map(d => {
              const active = diffs.includes(d);
              const disabled = !active && diffs.length >= 2;
              return (
                <button key={d} type="button" onClick={() => toggleDiff(d)} disabled={disabled}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    active ? 'bg-primary-light text-white border-primary-light'
                    : disabled ? 'bg-white text-secondary-dark/40 border-neutral-dark cursor-not-allowed'
                    : 'bg-white text-black-light border-neutral-dark hover:border-primary-light/40'}`}>
                  {active && <CheckCircle2 className="w-3.5 h-3.5" />}{d}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Communication tone</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TONES.map(t => (
              <button key={t.id} type="button" onClick={() => setTone(t.id)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                  tone === t.id ? 'bg-black text-white border-black' : 'bg-white text-secondary-dark border-neutral-dark hover:bg-neutral'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-secondary-dark/60 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" /> Affects future emails only — drafts already written won't change.</p>
        </div>

        <div className="flex justify-end"><SaveButton onClick={saveVoice} saving={savingVoice} /></div>
      </Collapsible>
    </>
  );
}

function TagGroup({ label, tags, cls }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => <span key={t} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cls}`}>{t}</span>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — EMAIL & SENDING
// ═══════════════════════════════════════════════════════════════════════════
const INBOX_STATUS = {
  Active:  { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  Warming: { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   icon: Flame },
  Paused:  { cls: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400',     icon: AlertTriangle },
};

// Mirrors backend MAX_INBOXES_PER_USER (integrations/serializers.py).
// ONE inbox per account during the invite-only pilot.
const MAX_INBOXES = 1;

function SendingTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['inboxes'], queryFn: getInboxStats });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [savingAF, setSavingAF] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [pendingGate, setPendingGate] = useState(false);
  const [params, setParams] = useSearchParams();

  // White-glove pilot gate: no Google button until a founder activates the
  // account (PendingActivationCard shows instead — never a dead end).
  const isPendingActivation = pendingGate || (profile && profile.activation_status !== 'activated');

  useEffect(() => {
    if (profile) setAutoFollow(profile.job_preferences?.auto_followups ?? true);
  }, [profile]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['inboxes'] }); qc.invalidateQueries({ queryKey: ['gmailAccounts'] }); };

  // Toast the result when Google bounces the user back here after consent.
  useEffect(() => {
    if (params.get('gmail_connected')) {
      toast.success('Gmail connected — you can send now.');
      refresh();
      params.delete('gmail_connected'); setParams(params, { replace: true });
    } else if (params.get('gmail_error')) {
      const code = params.get('gmail_error');
      if (code === 'activation') {
        // Reached Google before activation — show the white-glove state, no
        // raw error, no scary toast.
        setPendingGate(true);
      } else {
        toast.error(code === 'limit'
          ? 'One inbox per account during the pilot. Disconnect the current one to switch.'
          : 'Could not connect Gmail. Please try again.');
      }
      params.delete('gmail_error'); setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleConnect = async () => {
    setConnectingGoogle(true);
    try {
      const url = await getGmailOAuthUrl();
      window.location.href = url;   // leave to Google; it returns to the callback
    } catch (e) {
      setConnectingGoogle(false);
      if ((e.message || '').includes('pending_activation')) {
        setPendingGate(true);       // white-glove state, not an error
      } else {
        toast.error(e.message);
      }
    }
  };

  const handleToggle = async (id) => { setTogglingId(id); try { await toggleGmailAccount(id); refresh(); } catch (e) { toast.error(e.message); } finally { setTogglingId(null); } };
  const handleDelete = async (id) => { try { await deleteGmailAccount(id); toast.success('Inbox removed.'); refresh(); } catch (e) { toast.error(e.message); } setConfirmDelete(null); };

  const saveAutoFollow = async (v) => {
    setAutoFollow(v); setSavingAF(true);
    try {
      await updateProfile({ job_preferences: { ...(profile?.job_preferences || {}), auto_followups: v } });
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) { setAutoFollow(!v); toast.error(e.message); } finally { setSavingAF(false); }
  };

  const accounts = data?.accounts || [];
  // Capacity = the ENFORCED (age-ramped) limit, not the raw ceiling — honest.
  const activeAccounts = accounts.filter(a => a.status !== 'Paused');
  const totalCapacity = activeAccounts.reduce((s, a) => s + (a.effective_daily_limit ?? a.daily_send_limit ?? 0), 0);
  // New-introductions budget across active inboxes (limit // 4 each, from the API).
  const totalNewPerDay = activeAccounts.reduce((s, a) => s + (a.new_budget ?? Math.max(1, Math.floor((a.effective_daily_limit ?? 0) / 4))), 0);

  // Signature preview values
  const name = profile?.full_name || me?.first_name || 'Your Name';
  const email = profile?.contact_email || me?.email || 'you@gmail.com';
  const link = profile?.calendly_url || profile?.portfolio_url || '';
  const addr = profile?.location || 'Texas, United States';

  return (
    <>
      {/* Section A — Connected inboxes */}
      <Collapsible title="Connected Inboxes" description="The Gmail accounts your introductions send from." icon={Mail} defaultOpen>
        {isLoading ? <ApplyDirLoader.Inline /> : (
          <>
            {accounts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-secondary-dark">No inbox connected yet.</p>
                <p className="text-xs text-secondary-dark/70 mt-1">One click with Google — no passwords to paste.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map(acc => {
                  const st = INBOX_STATUS[acc.status] || INBOX_STATUS.Active;
                  // Show the ENFORCED limit (age-ramped), not the raw ceiling.
                  const enforced = acc.effective_daily_limit ?? acc.daily_send_limit ?? 0;
                  const warming = acc.warmup_stage && acc.warmup_stage !== 'fully_warmed';
                  const quotaPct = enforced ? (acc.sent_today / enforced) * 100 : 0;
                  const wp = acc.warmup;
                  return (
                    <div key={acc.id} className="rounded-2xl border border-neutral-dark p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary-light/10 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-primary-dark" /></div>
                          <span className="font-semibold text-black text-sm truncate">{acc.email}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${st.cls}`}>
                          <st.icon className="w-3 h-3" /> {acc.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <span className="text-secondary-dark">Daily limit</span>
                        <span className="text-black-light font-semibold text-right">
                          {enforced} / day{warming && <span className="text-amber-600 font-normal"> · warming up</span>}
                        </span>
                        <span className="text-secondary-dark">Sent today</span>
                        <span className="text-black-light font-semibold text-right">{acc.sent_today}/{enforced}</span>
                        {acc.new_budget != null && (
                          <>
                            <span className="text-secondary-dark">New intros today</span>
                            <span className="text-black-light font-semibold text-right">
                              {acc.new_sent_today ?? 0}/{acc.new_budget}
                              <span className="text-secondary-dark font-normal"> · follow-ups take the rest</span>
                            </span>
                          </>
                        )}
                        {wp?.days_running != null && (<><span className="text-secondary-dark">Account age</span><span className="text-black-light font-semibold text-right">{wp.days_running} days</span></>)}
                      </div>

                      {warming && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-snug">
                          New inbox warming up — its daily limit ramps <strong>5 → 10 → 20</strong> over ~2 weeks so Gmail trusts it. This is the number actually enforced today.
                        </p>
                      )}

                      <div className="w-full h-1.5 bg-neutral-dark rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${acc.status === 'Paused' ? 'bg-neutral-dark' : 'bg-primary-light'}`} style={{ width: `${Math.min(quotaPct, 100)}%` }} />
                      </div>

                      {acc.status === 'Warming' && wp && (
                        <div>
                          <div className="flex justify-between text-[11px] text-secondary-dark mb-1"><span>Warmup progress</span><span className="font-semibold text-amber-700">Day {wp.days_running}</span></div>
                          <div className="w-full h-1.5 bg-neutral-dark rounded-full overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(wp.progress || 0, 100)}%` }} /></div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button onClick={() => handleToggle(acc.id)} disabled={togglingId === acc.id}
                          className="text-xs font-semibold text-secondary-dark hover:text-black-light disabled:opacity-50">
                          {togglingId === acc.id ? 'Updating…' : acc.status === 'Paused' ? 'Resume sending' : 'Pause'}
                        </button>
                        <button onClick={() => setConfirmDelete(acc)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {accounts.length >= MAX_INBOXES ? (
              <p className="text-xs font-semibold text-secondary-dark bg-neutral-light border border-neutral-dark rounded-xl px-3 py-2.5">
                Your inbox is connected. One inbox per account during the pilot — remove it to connect a different Gmail.
              </p>
            ) : isPendingActivation ? (
              <PendingActivationCard />
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <button onClick={handleGoogleConnect} disabled={connectingGoogle} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-60">
                  {connectingGoogle ? <ApplyDirLoader.Button variant="light" /> : <Mail className="w-4 h-4" />} Connect Gmail with Google
                </button>
              </div>
            )}
            <p className="text-[11px] text-secondary-dark/70 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> One click with Google — no passwords, ever. We can only send introductions you approve and read the replies to them; nothing else in your inbox.</p>
            <p className="text-xs text-secondary-dark leading-relaxed">
              Your inbox sends about <span className="font-semibold text-black">5 new introductions a day</span>, with the rest of its daily limit reserved for follow-ups (where most replies come from)
              {totalCapacity > 0 && <> — right now that's about <span className="font-semibold text-black">{totalNewPerDay} new contact{totalNewPerDay === 1 ? '' : 's'}</span> and <span className="font-semibold text-black">{totalCapacity} total emails</span> per day.</>}
            </p>
          </>
        )}
      </Collapsible>

      {/* Section B — Sending preferences */}
      <Collapsible title="Sending Preferences" description="Follow-up cadence and automatic sending." icon={Send}>
        <ToggleRow icon={HeartHandshake} title="Automatic follow-ups" desc="Politely nudge non-responders on the schedule below, then stop." checked={autoFollow} saving={savingAF} onChange={saveAutoFollow} />
        <div className="rounded-xl border border-neutral-dark bg-neutral/50 p-4">
          <p className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider mb-2">Follow-up cadence (in the same thread)</p>
          <div className="grid grid-cols-3 gap-2">
            {[['Follow-up 1', 'Day 3'], ['Follow-up 2', 'Day 7'], ['Follow-up 3', 'Day 14']].map(([l, d]) => (
              <div key={l} className="bg-white rounded-xl border border-neutral-dark p-3 text-center">
                <p className="text-[10px] text-secondary-dark/60 uppercase tracking-wider">{l}</p>
                <p className="text-sm font-bold text-black mt-0.5">{d}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-secondary-dark/70 mt-2 flex items-start gap-1"><Info className="w-3 h-3 mt-0.5 shrink-0" /> The 3/7/14 cadence and sending window are tuned automatically for the best deliverability. The moment someone replies, all follow-ups stop.</p>
        </div>
        <div className="flex items-start gap-2 text-xs text-secondary-dark">
          <Clock className="w-4 h-4 text-primary-dark shrink-0 mt-0.5" />
          <span>Emails send Mon–Fri during the recipient's business hours (US-East window) — so they land when hiring managers are at their desks.</span>
        </div>
      </Collapsible>

      {/* Section C — Signature preview */}
      <Collapsible title="Email Signature Preview" description="Exactly what recipients see at the bottom of every email." icon={FileText}>
        <div className="rounded-xl border border-neutral-dark bg-neutral p-4 font-mono text-xs text-secondary-dark whitespace-pre-wrap leading-relaxed">
          <span>Warm regards,{'\n'}</span>
          <span className="text-black font-semibold">{name}</span>{'\n'}
          <span className="text-black">{email}</span>{link ? <>{'\n'}<span className="text-primary-dark">{link}</span></> : null}
          {'\n\n'}
          <span>{addr}</span>{'\n'}
          <span>Not the right time? Just reply 'stop' and you won't hear from me again.</span>{'\n'}
          <span>Privacy policy: applydir.com/privacy</span>
        </div>
        <p className="text-[11px] text-secondary-dark/60 flex items-center gap-1"><Info className="w-3 h-3" /> Pulls from your Profile (name, sign-off email, Calendly, location). Edit those in the Profile tab.</p>
      </Collapsible>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h4 className="text-lg font-bold mb-3 text-black font-montserrat">Remove inbox?</h4>
            <p className="text-sm text-secondary-dark mb-6">This disconnects <strong>{confirmDelete.email}</strong>. Scheduled emails from it will stop. You can reconnect anytime.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral hover:bg-neutral-dark transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — JOB PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════
const INDUSTRIES = ['Technology', 'Healthcare & Home Care', 'Business'];
const ARRANGEMENTS = [
  { id: 'remote', label: 'Remote only' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'any',    label: 'Open to anything' },
];

function JobsTab() {
  const qc = useQueryClient();
  const { data: scout, isLoading } = useQuery({ queryKey: ['auto-scout-settings'], queryFn: getAutoScoutSettings });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [industry, setIndustry] = useState('Technology');
  const [arrangement, setArrangement] = useState('remote');
  const [savingScout, setSavingScout] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (scout) { setRoles(scout.target_job_titles || []); setLocations(scout.target_locations || []); }
  }, [scout]);

  // Detect a role the user just ADDED (vs the initial load, which arrives as a
  // batch) so the "your headhunter will also look for…" chips fire for it.
  const prevRolesRef = useRef(null);
  const [suggestKw, setSuggestKw] = useState('');
  useEffect(() => {
    const prev = prevRolesRef.current;
    if (prev !== null && roles.length === prev.length + 1) {
      const added = roles.find((r) => !prev.includes(r));
      if (added) setSuggestKw(added);
    }
    prevRolesRef.current = roles;
  }, [roles]);
  useEffect(() => {
    if (profile) {
      const jp = profile.job_preferences || {};
      setIndustry(jp.industry || 'Technology');
      setArrangement(jp.work_arrangement || 'remote');
      setKeywords(jp.custom_keywords || []);
    }
  }, [profile]);

  const saveSearch = async () => {
    setSavingScout(true);
    try {
      await updateAutoScoutSettings({ target_job_titles: roles, target_locations: locations });
      await updateProfile({ job_preferences: { ...(profile?.job_preferences || {}), custom_keywords: keywords } });
      qc.invalidateQueries({ queryKey: ['auto-scout-settings'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Saved ✓ — takes effect on the next scout run.');
    } catch (e) { toast.error(e.message); } finally { setSavingScout(false); }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await updateProfile({ job_preferences: { ...(profile?.job_preferences || {}), industry, work_arrangement: arrangement } });
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Saved ✓');
    } catch (e) { toast.error(e.message); } finally { setSavingPrefs(false); }
  };

  if (isLoading) return <ApplyDirLoader.Inline />;

  return (
    <>
      <Collapsible title="Industry & Work Arrangement" description="The kind of work you're looking for." icon={Briefcase} defaultOpen>
        <div>
          <Label>Your industry</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {INDUSTRIES.map(i => (
              <button key={i} type="button" onClick={() => setIndustry(i)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${industry === i ? 'bg-black text-white border-black' : 'bg-white text-secondary-dark border-neutral-dark hover:bg-neutral'}`}>{i}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Work arrangement</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ARRANGEMENTS.map(a => (
              <button key={a.id} type="button" onClick={() => setArrangement(a.id)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${arrangement === a.id ? 'bg-black text-white border-black' : 'bg-white text-secondary-dark border-neutral-dark hover:bg-neutral'}`}>{a.label}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end"><SaveButton onClick={savePrefs} saving={savingPrefs} /></div>
      </Collapsible>

      <Collapsible title="Target Roles & Locations" description="What your headhunter searches for every morning." icon={SlidersHorizontal} defaultOpen>
        <div>
          <Label>Target roles</Label>
          <Chips value={roles} onChange={setRoles} placeholder="Backend Engineer, Django Developer…" />
          <p className="text-[11px] text-secondary-dark/70 mt-1.5">Press Enter or comma to add each. Your headhunter searches these every morning.</p>
          {/* Same-niche titles for the role they just typed — tap to include. */}
          <KeywordSuggestions
            keyword={suggestKw}
            existing={roles}
            onAdd={(t) => setRoles((prev) => prev.some((x) => x.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t])}
          />
        </div>
        <div>
          <Label>Target locations</Label>
          <Chips value={locations} onChange={setLocations} placeholder="Remote, United States, London…" pill="bg-blue-50 text-blue-700 border-blue-100" />
        </div>
        <div>
          <Label>Custom keywords</Label>
          <Chips value={keywords} onChange={setKeywords} placeholder="Django, FastAPI, n8n, Zapier…" pill="bg-emerald-50 text-emerald-700 border-emerald-100" />
          <p className="text-[11px] text-secondary-dark/70 mt-1.5">Added to your role-based search for more precise matches.</p>
        </div>
        <div className="flex justify-end"><SaveButton onClick={saveSearch} saving={savingScout} /></div>
      </Collapsible>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════
function tzOptions() {
  try { if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone'); } catch { /* older browser */ }
  return ['UTC', 'Africa/Lagos', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Dubai'];
}

function AccountTab({ navigate }) {
  const qc = useQueryClient();
  const { logout } = useAuth();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  // Login
  const [username, setUname] = useState('');
  const [savingUname, setSavingUname] = useState(false);
  const [cur, setCur] = useState(''); const [nxt, setNxt] = useState(''); const [cfm, setCfm] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  // Notifications
  const [scout, setScout] = useState(true); const [nudge, setNudge] = useState(true);
  const [replyNotif, setReplyNotif] = useState(true); const [weekly, setWeekly] = useState(false);
  const [tz, setTz] = useState('UTC'); const [savingPref, setSavingPref] = useState(false);
  // Push notifications (this device) + per-type prefs
  const [pushOn, setPushOn] = useState(false); const [pushBusy, setPushBusy] = useState(false);
  const [pushHere] = useState(() => pushAvailableHere());
  const [pReply, setPReply] = useState(true); const [pInbox, setPInbox] = useState(true);
  const [pOpps, setPOpps] = useState(true); const [pSends, setPSends] = useState(true);
  // Delete
  const [confirmText, setConfirmText] = useState(''); const [delPw, setDelPw] = useState(''); const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (me?.username) setUname(me.username); }, [me?.username]);
  useEffect(() => {
    if (!profile) return;
    setScout(profile.notify_scout_digest ?? true);
    setNudge(profile.notify_pipeline_nudges ?? true);
    setReplyNotif(profile.job_preferences?.notify_replies ?? true);
    setWeekly(profile.job_preferences?.notify_weekly ?? false);
    setTz(profile.timezone || 'UTC');
    setPReply(profile.push_notify_reply ?? true);
    setPInbox(profile.push_notify_inbox_issue ?? true);
    setPOpps(profile.push_notify_opportunities ?? true);
    setPSends(profile.push_notify_sends ?? true);
  }, [profile]);

  // Reflect whether THIS device is currently subscribed.
  useEffect(() => { isPushEnabled().then(setPushOn).catch(() => {}); }, []);

  const toggleMasterPush = async (v) => {
    setPushBusy(true);
    try {
      if (v) {
        const { ok, reason } = await enablePush();
        setPushOn(ok);
        if (ok) toast.success('Notifications on for this device.');
        else toast.error(pushFailureMessage(reason));
      } else {
        await disablePush();
        setPushOn(false);
        toast.success('Notifications off for this device.');
      }
    } finally { setPushBusy(false); }
  };

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
  const usernameChanged = username.trim() !== (me?.username || '');

  const saveUsername = async () => {
    if (!usernameValid) return toast.error('3–20 chars: letters, numbers, underscores.');
    setSavingUname(true);
    try { await setUsername(username.trim()); toast.success('Username updated.'); qc.invalidateQueries({ queryKey: ['me'] }); }
    catch (e) { toast.error(e.message); } finally { setSavingUname(false); }
  };
  const savePassword = async () => {
    if (nxt.length < 8) return toast.error('New password must be at least 8 characters.');
    if (nxt !== cfm) return toast.error('New passwords do not match.');
    setSavingPw(true);
    try { await changePassword({ current_password: cur, new_password: nxt }); toast.success('Password updated.'); setCur(''); setNxt(''); setCfm(''); }
    catch (e) { toast.error(e.message); } finally { setSavingPw(false); }
  };
  const sendReset = async () => {
    if (!me?.email) return; setSendingReset(true);
    try { await forgotPassword(me.email); toast.success(`Reset link sent to ${me.email}.`); }
    catch (e) { toast.error(e.message); } finally { setSendingReset(false); }
  };

  const saveProfilePref = async (patch, revert) => {
    setSavingPref(true);
    try { await updateProfile(patch); qc.invalidateQueries({ queryKey: ['profile'] }); }
    catch (e) { revert?.(); toast.error(e.message); } finally { setSavingPref(false); }
  };
  const saveJobPref = async (key, val, revert) => {
    setSavingPref(true);
    try { await updateProfile({ job_preferences: { ...(profile?.job_preferences || {}), [key]: val } }); qc.invalidateQueries({ queryKey: ['profile'] }); }
    catch (e) { revert?.(); toast.error(e.message); } finally { setSavingPref(false); }
  };
  const saveTz = async (v) => { setTz(v); saveProfilePref({ timezone: v }); toast.success('Timezone saved.'); };

  const downloadData = () => {
    const blob = new Blob([JSON.stringify({ account: me, profile }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'applydir-my-data.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success('Your data downloaded.');
  };

  const handleLogout = async () => { await logout(); toast.success('Signed out.'); setTimeout(() => navigate('/', { replace: true }), 400); };
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount({ password: delPw, confirm: confirmText });
      toast.success('Your account and all data have been deleted.');
      try { await logout(); } catch { /* token may be gone */ }
      localStorage.clear();
      setTimeout(() => navigate('/', { replace: true }), 600);
    } catch (e) { toast.error(e.message); } finally { setDeleting(false); }
  };

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <>
      {/* Subscription */}
      <Collapsible title="Subscription" description="Your current plan." icon={Crown} defaultOpen
        badge={<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral text-secondary-dark text-[10px] font-bold uppercase tracking-wider border border-neutral-dark">Free</span>}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-black">You're on the Free plan</p>
            <p className="text-xs text-secondary-dark mt-0.5">Full access while we're in early access.</p>
          </div>
          <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral text-secondary-dark text-sm font-semibold cursor-not-allowed">
            <Crown className="w-4 h-4" /> Upgrade to Pro — $29/mo <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Soon</span>
          </button>
        </div>
      </Collapsible>

      {/* Login */}
      <Collapsible title="Login & Password" description="Your sign-in details." icon={KeyRound}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label>Username</Label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-secondary-dark/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={username} onChange={e => setUname(e.target.value)} placeholder="your_username" autoComplete="username" className="pl-9" />
            </div>
            {username && !usernameValid && <p className="text-[11px] text-red-500 mt-1">3–20 chars · letters, numbers, underscores.</p>}
          </div>
          <SaveButton onClick={saveUsername} saving={savingUname} disabled={!usernameChanged || !usernameValid} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div><Label>Current password</Label><Input type="password" value={cur} onChange={e => setCur(e.target.value)} autoComplete="current-password" /></div>
          <div><Label>New password</Label><Input type="password" value={nxt} onChange={e => setNxt(e.target.value)} autoComplete="new-password" /></div>
          <div><Label>Confirm new</Label><Input type="password" value={cfm} onChange={e => setCfm(e.target.value)} autoComplete="new-password" /></div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={sendReset} disabled={sendingReset} className="text-xs font-semibold text-primary-dark hover:text-primary-light disabled:opacity-60">{sendingReset ? 'Sending…' : 'Forgot password? Email me a reset link'}</button>
          <SaveButton onClick={savePassword} saving={savingPw} disabled={!cur || !nxt || !cfm}>Update Password</SaveButton>
        </div>
      </Collapsible>

      {/* Notifications */}
      <Collapsible title="Notifications" description="Optional emails and your timezone." icon={Bell}>
        <ToggleRow icon={Bell} title="Daily scout digest" desc="A morning summary of new roles matched to your CV." checked={scout} saving={savingPref} onChange={v => { setScout(v); saveProfilePref({ notify_scout_digest: v }, () => setScout(!v)); }} />
        <div className="h-px bg-neutral-dark/60" />
        <ToggleRow icon={HeartHandshake} title="Reply notifications" desc="Get emailed the moment a hiring manager replies." checked={replyNotif} saving={savingPref} onChange={v => { setReplyNotif(v); saveJobPref('notify_replies', v, () => setReplyNotif(!v)); }} />
        <div className="h-px bg-neutral-dark/60" />
        <ToggleRow icon={ArrowRight} title="Re-engagement nudges" desc="A reminder when jobs or contacts are waiting on a next step." checked={nudge} saving={savingPref} onChange={v => { setNudge(v); saveProfilePref({ notify_pipeline_nudges: v }, () => setNudge(!v)); }} />
        <div className="h-px bg-neutral-dark/60" />
        <ToggleRow icon={FileText} title="Weekly summary email" desc="A weekly recap of your outreach and results." checked={weekly} saving={savingPref} onChange={v => { setWeekly(v); saveJobPref('notify_weekly', v, () => setWeekly(!v)); }} />
        <div className="pt-2">
          <Label>Timezone</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-4 h-4 text-primary-dark shrink-0" />
            <select value={tz} onChange={e => saveTz(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20">
              {tzOptions().map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {browserTz && tz !== browserTz && <button onClick={() => saveTz(browserTz)} className="text-xs font-semibold text-primary-dark hover:underline mt-1.5">Use my device timezone ({browserTz.replace(/_/g, ' ')})</button>}
        </div>
      </Collapsible>

      {/* Push notifications (this device) */}
      <Collapsible title="Push notifications" description="Get pinged on your phone or desktop." icon={Bell}>
        {!pushHere ? (
          <div className="text-sm text-secondary-dark bg-neutral/50 rounded-xl border border-neutral-dark p-4">
            {isIOS() && !isStandalone()
              ? "On iPhone, add ApplyDir to your home screen first (Share → Add to Home Screen), then open it from there to turn on notifications."
              : "This browser doesn't support push notifications. Try Chrome, or install the app to your home screen."}
          </div>
        ) : (
          <>
            <ToggleRow icon={Bell} title="Enable on this device"
              desc="Show notifications on this phone/computer. You can turn on each device separately."
              checked={pushOn} saving={pushBusy} onChange={toggleMasterPush} />
            <div className="h-px bg-neutral-dark/60" />
            <ToggleRow icon={HeartHandshake} title="Replies" desc="The moment a hiring manager replies to your intro."
              checked={pReply} saving={savingPref}
              onChange={v => { setPReply(v); saveProfilePref({ push_notify_reply: v }, () => setPReply(!v)); }} />
            <div className="h-px bg-neutral-dark/60" />
            <ToggleRow icon={Bell} title="Inbox issues" desc="If a connected Gmail disconnects and sending pauses."
              checked={pInbox} saving={savingPref}
              onChange={v => { setPInbox(v); saveProfilePref({ push_notify_inbox_issue: v }, () => setPInbox(!v)); }} />
            <div className="h-px bg-neutral-dark/60" />
            <ToggleRow icon={ArrowRight} title="New opportunities" desc="A morning ping when fresh roles are matched."
              checked={pOpps} saving={savingPref}
              onChange={v => { setPOpps(v); saveProfilePref({ push_notify_opportunities: v }, () => setPOpps(!v)); }} />
            <div className="h-px bg-neutral-dark/60" />
            <ToggleRow icon={FileText} title="Daily send summary" desc="A recap of the intros sent for you today."
              checked={pSends} saving={savingPref}
              onChange={v => { setPSends(v); saveProfilePref({ push_notify_sends: v }, () => setPSends(!v)); }} />
            {pushOn && (
              <div className="pt-2">
                <button onClick={async () => { const n = await sendTestPush(); toast[n ? 'success' : 'error'](n ? 'Test sent — check your notifications.' : 'No devices to send to yet.'); }}
                  className="text-xs font-semibold text-primary-dark hover:underline">Send a test notification</button>
              </div>
            )}
          </>
        )}
      </Collapsible>

      {/* Data & privacy */}
      <Collapsible title="Data & Privacy" description="Export your data or view our policies." icon={ShieldCheck}>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadData} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold transition-all"><Download className="w-4 h-4" /> Download my data</button>
          <a href="/privacy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-dark text-secondary-dark text-sm font-semibold hover:text-black-light transition-all"><ShieldCheck className="w-4 h-4" /> Privacy policy</a>
        </div>
        <div className="pt-2"><LegalSections /></div>
      </Collapsible>

      {/* About */}
      <Collapsible title="About" description="App version and support." icon={Info}>
        <div className="text-sm text-secondary-dark space-y-1">
          <p>ApplyDir <span className="text-black-light font-semibold">v1.0</span></p>
          <p><a href="mailto:atoyebijoshua095@gmail.com" className="text-primary-dark font-semibold hover:underline">Support & feedback</a></p>
          <p className="text-xs text-secondary-dark/60 pt-1">Built with <span className="text-red-500">♥</span> by Jatotech</p>
        </div>
      </Collapsible>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 py-4 md:py-5 border-b border-red-100 bg-red-50/40">
          <h3 className="text-base md:text-lg font-bold font-montserrat text-red-700">Danger Zone</h3>
          <p className="text-xs md:text-sm text-red-600/70 mt-0.5">Sign out or permanently delete your account.</p>
        </div>
        <div className="px-5 md:px-6 py-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-secondary-dark">End your session on this device.</p>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl transition-all"><LogOut className="w-4 h-4" /> Sign Out</button>
          </div>
          <div className="h-px bg-red-100" />
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Deleting is permanent — profile, jobs, contacts, emails, and inboxes are all erased. Connected inboxes stop sending immediately.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type DELETE to confirm</Label><Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" /></div>
            <div><Label>Your password</Label><Input type="password" value={delPw} onChange={e => setDelPw(e.target.value)} placeholder="Leave blank if you use Google sign-in" autoComplete="current-password" /></div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleDelete} disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-200 transition-all disabled:opacity-50">
              {deleting ? <ApplyDirLoader.Button variant="light" /> : <Trash2 className="w-4 h-4" />} Permanently delete my account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
