import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Mail, Briefcase, SlidersHorizontal, ChevronDown, Lock, Save,
  FileText, Upload, Sparkles, Plus, X,
  Bell, Clock, KeyRound, AtSign, LogOut, Trash2, AlertTriangle, ShieldCheck,
  Crown, Flame, CheckCircle2, Send, Download, Info, ArrowRight, HeartHandshake,
  RefreshCw, AlertCircle, HelpCircle,
} from 'lucide-react';
import { ApplyDirLoader } from '@/components/ui/ApplyDirLoader';
import { getMe, changePassword, deleteAccount, forgotPassword, setUsername } from '@/services/apiAuth';
import { getProfile, updateProfile, uploadCV } from '@/services/apiProfile';
import { getAutoScoutSettings, updateAutoScoutSettings } from '@/services/apiSettings';
import {
  TONES, SECRET_WEAPON_MAX, differentiatorOptions, secretWeaponPlaceholder,
} from '@/constants/personalization';
import {
  parseProject, serializeProject, emptyProject, projectSummary, isProjectEmpty,
} from '@/lib/projectHighlights';
import { getInboxStats } from '@/services/apiInboxes';
import { deleteGmailAccount, toggleGmailAccount } from '@/services/apiGmail';
import { toggleWarmupPool } from '@/services/apiWarmup';
import WarmupConsentModal from './WarmupConsentModal';
import { useConnectProvider } from '@/hooks/useConnectProvider';
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

/*
 * The mobile stand-in for <Collapsible>. On a phone each section gets its own
 * route (/dashboard/settings/<slug>), so there is nothing to expand — the panel
 * is just the card body. Same props as Collapsible so the tabs can swap one for
 * the other with a single assignment; `icon`, `badge` and `defaultOpen` are
 * accepted and ignored (the route header already carries the title + icon).
 *
 * `showTitle` is only set when a screen stacks TWO panels (the merged
 * Notifications screen), where the route header alone can't label both.
 */
function SectionPanel({ title, description, showTitle = false, children }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm p-5 space-y-4">
      {(showTitle || description) && (
        <div className="space-y-0.5">
          {showTitle && <h3 className="text-base font-bold font-montserrat text-black">{title}</h3>}
          {description && <p className="text-sm text-secondary-dark">{description}</p>}
        </div>
      )}
      {children}
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
// `initialTab` is used ONLY by the mobile section route, so that a desktop
// browser sitting on /dashboard/settings/inboxes still opens the right tab.
// Undefined everywhere else, which leaves the original behaviour untouched.
const Settings = ({ initialTab }) => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = params.get('tab');
  const [activeTab, setActiveTab] = useState(
    TABS.some(t => t.key === tabFromUrl) ? tabFromUrl
      : TABS.some(t => t.key === initialTab) ? initialTab
        : 'profile',
  );

  const selectTab = (key) => { setActiveTab(key); setParams(key === 'profile' ? {} : { tab: key }, { replace: true }); };

  return (
    // Same page frame as Opportunities so the padding + edges line up across
    // the app: p-4 md:p-8, max-w-[1400px] mx-auto, space-y-6.
    //
    // `hidden md:block` is the ONLY change to the desktop path: below 768px the
    // tab rail is replaced by the Level 1 row list (SettingsMobile.jsx), and at
    // md+ `block` is the display a <div> already had, so the desktop render is
    // unchanged.
    <div className="hidden md:block relative isolate p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in font-roboto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">Settings</h1>
        <p className="text-sm text-secondary-dark mt-1">Everything about your account — profile, sending, job search, and login.</p>
      </div>

      {/* Sub-nav rail (screenshot inspo): horizontal scroll on mobile, a sticky
          vertical rail on desktop, with the wide content panel beside it. */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-60 shrink-0 md:sticky md:top-6">
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory md:snap-none scroll-px-1 -mx-1 px-1 pb-1 md:pb-0 md:mx-0 md:px-0">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => selectTab(tab.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold whitespace-nowrap transition-all shrink-0 snap-start md:w-full ${
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
// TONES / the differentiator options / the length cap all come from the shared
// module now — they used to be duplicated verbatim here and in
// FirstTimePersonalizationModal.jsx, free to drift apart.
const SECRET_MAX = SECRET_WEAPON_MAX;

// `only` renders a SINGLE section as a full mobile screen (see
// constants/settingsSections.js). Undefined — every desktop render — keeps all
// sections and the Collapsible chrome exactly as before.
function ProfileTab({ only }) {
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
  // Only one project card is open at a time — five expanded cards is more than
  // fits on a phone, and the summary line is enough to find the right one.
  const [openProject, setOpenProject] = useState(null);
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
    // Stored entries are strings holding Python dict reprs (see lib/projectHighlights);
    // parse once here so the form works with real fields, never raw text.
    setProjects((profile.project_highlights || []).map(parseProject));
    setOpenProject(null);
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
        project_highlights: projects.filter(p => !isProjectEmpty(p)).map(serializeProject),
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
  // Edit one field of one project. Key names are preserved on save — the
  // canonical ids here are a UI concern only (see serializeProject).
  const setProjectField = (i, field, value) => setProjects(prev => {
    const next = [...prev];
    next[i] = { ...next[i], fields: { ...next[i].fields, [field]: value } };
    return next;
  });

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
  const P = only ? SectionPanel : Collapsible;
  const show = (key) => !only || only === key;

  return (
    <>
      {show('identity') && <>
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
      <P title="Your Identity" description="Name, location, and the links in your email sign-off." icon={User} defaultOpen>
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
      </P>
      </>}

      {show('cv') && <>
      {/* Section B — CV */}
      <P title="Your CV" description="Powers job scoring, your tailored CVs, and your email voice." icon={FileText}>
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
      </P>
      </>}

      {show('voice') && <>
      {/* Section C+D — Voice: summary, projects, secret weapon, differentiators, tone */}
      <P
        title="Your Outreach Voice"
        description="This is what we draw on when we write to a hiring manager. The more real detail here, the less your introductions sound like everyone else's."
        icon={Sparkles}
      >
        <div>
          <Label>Your one-line summary</Label>
          <p className="text-xs text-secondary-dark mb-1.5">How you&rsquo;d describe yourself in a sentence.</p>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
            placeholder="Full-stack engineer specializing in backend systems and API architecture"
            className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 resize-none" />
        </div>

        <div>
          <Label>Project highlights</Label>
          <p className="text-xs text-secondary-dark mb-2">
            We pick the one project that best matches each role. Give us a few to choose from.
          </p>
          <div className="space-y-2.5">
            {projects.map((p, i) => (
              <ProjectCard
                key={i}
                project={p}
                expanded={openProject === i}
                onToggle={() => setOpenProject(openProject === i ? null : i)}
                onChange={(field, value) => setProjectField(i, field, value)}
                onRemove={() => {
                  setProjects(projects.filter((_, x) => x !== i));
                  setOpenProject(null);
                }}
              />
            ))}
            <button
              onClick={() => { setProjects([...projects, emptyProject()]); setOpenProject(projects.length); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark hover:text-primary-light min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" /> Add project
            </button>
          </div>
        </div>

        <div>
          <Label>Your secret weapon</Label>
          <p className="text-xs text-secondary-dark mb-1.5">What's one thing you bring that isn't on your CV?</p>
          <textarea value={secret} onChange={e => setSecret(e.target.value.slice(0, SECRET_MAX))} rows={2}
            placeholder={secretWeaponPlaceholder(profile)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 resize-none" />
          <p className="text-[11px] text-secondary-dark/60 text-right mt-1">{secret.length}/{SECRET_MAX}</p>
        </div>

        <div>
          <Label>What makes you stand out? (pick up to 2)</Label>
          <div className="flex flex-wrap gap-2">
            {differentiatorOptions(profile).map(d => {
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
      </P>
      </>}
    </>
  );
}

// One project, as labelled fields rather than a stringified data structure.
// Collapsed to a summary line by default: the user has up to five of these and
// all five expanded does not fit on a 375px screen.
function ProjectCard({ project, expanded, onToggle, onChange, onRemove }) {
  const f = project.fields;
  const input = 'w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all';
  const area = `${input} resize-none`;
  const fieldLabel = 'block text-[11px] font-bold uppercase tracking-wider text-secondary-dark/60 mb-1';

  return (
    <div className="bg-white rounded-2xl border border-neutral-dark">
      <div className="flex items-center gap-2 px-6 py-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 flex items-center gap-2 min-w-0 text-left min-h-[44px]"
        >
          <ChevronDown className={`w-4 h-4 shrink-0 text-secondary-dark transition-transform ${expanded ? 'rotate-180' : ''}`} />
          <span className="text-sm font-semibold text-black-light truncate">
            {projectSummary(f)}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${projectSummary(f)}`}
          className="shrink-0 text-red-400 hover:text-red-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-5 space-y-3 border-t border-neutral-dark pt-4">
          <div>
            <label className={fieldLabel}>Project name</label>
            <input type="text" value={f.name} onChange={e => onChange('name', e.target.value)}
              placeholder="FumiSync" className={input} />
          </div>
          <div>
            <label className={fieldLabel}>Your role</label>
            <input type="text" value={f.role} onChange={e => onChange('role', e.target.value)}
              placeholder="Founder & Lead Engineer" className={input} />
          </div>
          <div>
            <label className={fieldLabel}>What it does</label>
            <textarea rows={2} value={f.description} onChange={e => onChange('description', e.target.value)}
              placeholder="Middleware that connects legacy dental systems to modern CRMs." className={area} />
          </div>
          <div>
            <label className={fieldLabel}>The hard part</label>
            <p className="text-xs text-secondary-dark mb-1">
              What was actually difficult about it. This is the detail that makes an email land.
            </p>
            <textarea rows={2} value={f.challenge} onChange={e => onChange('challenge', e.target.value)}
              placeholder="Keeping two systems in sync that were never designed to talk." className={area} />
          </div>
          <div>
            <label className={fieldLabel}>Built with</label>
            <input type="text" value={f.tools} onChange={e => onChange('tools', e.target.value)}
              placeholder="FastAPI, Redis, PostgreSQL" className={input} />
          </div>
        </div>
      )}
    </div>
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
  // 'Paused' = the user paused it (resume any time). 'Issue' = the token was
  // revoked and the inbox needs re-authorising (Reconnect) — a stronger, more
  // alarming red so it reads as "needs your action", not "resting".
  Paused:  { cls: 'bg-neutral-light text-secondary-dark border-neutral-dark', dot: 'bg-neutral-dark', icon: AlertTriangle },
  Issue:   { cls: 'bg-red-50 text-red-700 border-red-300',             dot: 'bg-red-500',     icon: AlertCircle },
};

// Small provider mark for a connected inbox — brand-colored inline SVG so no
// external asset/CSP dependency. Gmail = red envelope 'M', Outlook = blue 'O'.
function ProviderBadge({ provider }) {
  if (provider === 'outlook') {
    return (
      <div className="w-8 h-8 rounded-full bg-[#0A66C2]/10 flex items-center justify-center shrink-0" title="Outlook">
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path fill="#0A66C2" d="M13 4h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7v-4h5v-2h-5V9h5V7h-5V4Z" />
          <path fill="#0A66C2" d="M2 5.6 12 4v16L2 18.4V5.6Z" />
          <text x="7" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">O</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#EA4335]/10 flex items-center justify-center shrink-0" title="Gmail">
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path fill="#EA4335" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.4 2L12 12.3 19.6 7H4.4Z" />
      </svg>
    </div>
  );
}

// Tiny hover/focus info affordance — an (i) that reveals a short explainer.
// Right-anchored so it stays inside the card even near the right edge; `title`
// gives the same text to keyboard/touch users as a fallback.
function InfoTip({ children, label = 'What’s this?', align = 'right' }) {
  const text = typeof children === 'string' ? children : undefined;
  const pos = align === 'left' ? 'left-0' : 'right-0';
  return (
    <span className="relative inline-flex group align-middle">
      <button type="button" aria-label={label} title={text}
        className="text-secondary-dark/50 hover:text-secondary-dark focus:outline-none">
        <Info className="w-3 h-3" />
      </button>
      <span role="tooltip"
        className={`pointer-events-none absolute bottom-full ${pos} mb-1.5 w-56 z-50 rounded-lg bg-black text-white text-[11px] font-normal leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg`}>
        {children}
      </span>
    </span>
  );
}

// See ProfileTab for what `only` does.
function SendingTab({ only }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['inboxes'], queryFn: getInboxStats });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [savingAF, setSavingAF] = useState(false);
  const [pendingGate, setPendingGate] = useState(false);
  const [params, setParams] = useSearchParams();
  // Warm-up POOL enrolment (opt-in seed-exchange). `warmupModalAcc` = the inbox
  // whose consent modal is open; `warmupBusyId` = inbox mid-toggle;
  // `pendingWarmupProvider` = after a fresh connect, prompt that provider's inbox.
  const [warmupModalAcc, setWarmupModalAcc] = useState(null);
  const [warmupBusyId, setWarmupBusyId] = useState(null);
  const [pendingWarmupProvider, setPendingWarmupProvider] = useState(null);

  // Single owner of the connect flow (explainer → OAuth redirect). Both the
  // connect buttons and reconnect use it; Gmail gets the pre-consent explainer,
  // Outlook and reconnect skip it. `explainer` is rendered near the modals below.
  const {
    connectingGoogle, connectingOutlook,
    connectGoogle, connectOutlook, reconnect, explainer,
  } = useConnectProvider({ onPendingActivation: () => setPendingGate(true) });

  // Testing-mode activation gate DISABLED 2026-07-30 (Google OAuth app is now
  // PUBLISHED — no allowlisting). Hardwired off so the connect buttons always
  // render. PendingActivationCard + the pendingGate plumbing + activation_status
  // are retained for the planned invite-code gate — to re-gate, restore the
  // condition `pendingGate || (profile && profile.activation_status !== 'activated')`.
  const isPendingActivation = false;

  useEffect(() => {
    if (profile) setAutoFollow(profile.job_preferences?.auto_followups ?? true);
  }, [profile]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['inboxes'] }); qc.invalidateQueries({ queryKey: ['gmailAccounts'] }); };

  // Toast the result when a provider bounces the user back here after consent.
  useEffect(() => {
    if (params.get('gmail_connected')) {
      toast.success('Gmail connected — you can send now.');
      refresh();
      setPendingWarmupProvider('gmail');  // offer warm-up once stats reload
      params.delete('gmail_connected'); setParams(params, { replace: true });
    } else if (params.get('outlook_connected')) {
      toast.success('Outlook connected — you can send now.');
      refresh();
      setPendingWarmupProvider('outlook');
      params.delete('outlook_connected'); setParams(params, { replace: true });
    } else if (params.get('gmail_error')) {
      const code = params.get('gmail_error');
      if (code === 'cancelled') {
        // User backed out at Google's consent / unverified-app screen. Not an
        // error — a reassuring nudge, with a Try again that re-opens the connect
        // flow (which re-shows the pre-consent explainer).
        toast.info(({ closeToast }) => (
          <div>
            <p className="text-sm">Sign-in cancelled. If Google's warning stopped you, tap Advanced → Go to ApplyDir — it's safe, we're just awaiting review.</p>
            <button
              onClick={() => { closeToast(); connectGoogle(); }}
              className="mt-2 text-xs font-bold text-primary-dark hover:text-primary-light"
            >
              Try again
            </button>
          </div>
        ));
      } else {
        toast.error(code === 'limit'
          ? 'You already have a Gmail connected. Disconnect it to switch.'
          : 'Could not connect Gmail. Please try again.');
      }
      params.delete('gmail_error'); setParams(params, { replace: true });
    } else if (params.get('outlook_error')) {
      const code = params.get('outlook_error');
      toast.error(code === 'limit'
        ? 'You already have an Outlook connected. Disconnect it to switch.'
        : 'Could not connect Outlook. Please try again.');
      params.delete('outlook_error'); setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (id) => { setTogglingId(id); try { await toggleGmailAccount(id); refresh(); } catch (e) { toast.error(e.message); } finally { setTogglingId(null); } };
  const handleDelete = async (id) => { try { await deleteGmailAccount(id); toast.success('Inbox removed.'); refresh(); } catch (e) { toast.error(e.message); } setConfirmDelete(null); };

  // After a fresh connect, once inbox stats reload, prompt warm-up for the newly
  // connected inbox — but only if it isn't already enrolled (skips reconnects).
  useEffect(() => {
    if (!pendingWarmupProvider || !data?.accounts) return;
    const acc = data.accounts.find(
      a => (a.provider || 'gmail') === pendingWarmupProvider && !a.warmup_pool?.is_enabled
    );
    if (acc) setWarmupModalAcc(acc);
    setPendingWarmupProvider(null);
  }, [pendingWarmupProvider, data]);

  // Enable (from the consent modal — the ONLY place we record consent) or disable
  // warm-up for one inbox.
  const confirmWarmup = async () => {
    const acc = warmupModalAcc;
    if (!acc) return;
    setWarmupBusyId(acc.id);
    try {
      await toggleWarmupPool(acc.id, true);
      toast.success('Warm-up on — building this inbox’s reputation.');
      setWarmupModalAcc(null);
      refresh();
    } catch (e) { toast.error(e.message); } finally { setWarmupBusyId(null); }
  };
  const disableWarmup = async (acc) => {
    setWarmupBusyId(acc.id);
    try {
      await toggleWarmupPool(acc.id, false);
      toast.info('Warm-up turned off for this inbox.');
      refresh();
    } catch (e) { toast.error(e.message); } finally { setWarmupBusyId(null); }
  };

  const saveAutoFollow = async (v) => {
    setAutoFollow(v); setSavingAF(true);
    try {
      await updateProfile({ job_preferences: { ...(profile?.job_preferences || {}), auto_followups: v } });
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) { setAutoFollow(!v); toast.error(e.message); } finally { setSavingAF(false); }
  };

  const accounts = data?.accounts || [];
  // One inbox per provider during the pilot — offer each connect button only
  // when that provider isn't already connected.
  const hasGmail = accounts.some(a => (a.provider || 'gmail') === 'gmail');
  const hasOutlook = accounts.some(a => a.provider === 'outlook');

  // Signature preview values
  const name = profile?.full_name || me?.first_name || 'Your Name';
  const email = profile?.contact_email || me?.email || 'you@gmail.com';
  const link = profile?.calendly_url || profile?.portfolio_url || '';
  const addr = profile?.location || 'Texas, United States';
  const P = only ? SectionPanel : Collapsible;
  const show = (key) => !only || only === key;

  return (
    <>
      {show('inboxes') && <>
      {/* Section A — Connected inboxes */}
      <P title="Connected Inboxes" description="The inboxes your introductions send from." icon={Mail} defaultOpen>
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
                          <ProviderBadge provider={acc.provider} />
                          <span className="font-semibold text-black text-sm truncate">{acc.email}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${st.cls}`}>
                          <st.icon className="w-3 h-3" /> {acc.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <span className="text-secondary-dark">Daily limit</span>
                        <span className="text-black-light font-semibold text-right">
                          {enforced} / day{warming && (
                            <span className="text-amber-600 font-normal"> · warming up{' '}
                              <InfoTip label="What does “warming up” mean?">
                                Automatic: a new inbox's daily send limit starts low and
                                grows to full over ~2 weeks on its own. Different from the
                                <strong> Warm-up</strong> toggle below, which actively builds
                                reputation by exchanging mail with our network.
                              </InfoTip>
                            </span>
                          )}
                        </span>
                        <span className="text-secondary-dark">Sent today</span>
                        <span className="text-black-light font-semibold text-right">{acc.sent_today}/{enforced}</span>
                        {/* Both numbers come from allocate_daily_budget, so this
                            is exactly what the send path will allow today. */}
                        {acc.original_budget != null && (
                          <>
                            <span className="text-secondary-dark">New intros today</span>
                            <span className="text-black-light font-semibold text-right">
                              {acc.new_sent_today ?? 0}/{acc.original_budget}
                              {acc.followups_due > 0 && (
                                <span className="text-secondary-dark font-normal">
                                  {' '}· {acc.followups_due} follow-up{acc.followups_due === 1 ? '' : 's'} reserved
                                </span>
                              )}
                            </span>
                          </>
                        )}
                        {wp?.days_running != null && (<><span className="text-secondary-dark">Account age</span><span className="text-black-light font-semibold text-right">{wp.days_running} days</span></>)}
                      </div>

                      {acc.status === 'Issue' && (
                        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 leading-snug">
                          <strong>{acc.provider === 'outlook' ? 'Microsoft' : 'Google'} disconnected this inbox</strong> — its access was revoked (a password change or security update usually does it), so sending has stopped. Click <strong>Reconnect</strong> to sign in again and resume; nothing else is lost.
                        </p>
                      )}

                      {warming && acc.status !== 'Issue' && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-snug">
                          Building your reputation — new inboxes start at 5 introductions a day and grow to 20 over about two weeks. Sending slowly at first is what keeps you out of spam later.
                        </p>
                      )}

                      <div className="w-full h-1.5 bg-neutral-dark rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(acc.status === 'Paused' || acc.status === 'Issue') ? 'bg-neutral-dark' : 'bg-primary-light'}`} style={{ width: `${Math.min(quotaPct, 100)}%` }} />
                      </div>

                      {acc.status === 'Warming' && wp && (
                        <div>
                          <div className="flex justify-between text-[11px] text-secondary-dark mb-1"><span>Warmup progress</span><span className="font-semibold text-amber-700">Day {wp.days_running}</span></div>
                          <div className="w-full h-1.5 bg-neutral-dark rounded-full overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(wp.progress || 0, 100)}%` }} /></div>
                        </div>
                      )}

                      {/* Warm-up POOL (opt-in seed-exchange) — builds reputation
                          by exchanging real mail with our private mailbox network.
                          Distinct from the passive age-ramp shown above. */}
                      {acc.status !== 'Issue' && (() => {
                        const pool = acc.warmup_pool || {};
                        const busy = warmupBusyId === acc.id;
                        return (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-dark bg-neutral-light px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-black-light">
                                <Flame className="w-3.5 h-3.5 text-primary-dark" /> Warm-up
                                <InfoTip label="What is Warm-up?" align="left">
                                  Actively builds this inbox's reputation by exchanging a few
                                  low-volume, natural emails with our private mailbox network,
                                  so your real emails land in the inbox. Separate from the
                                  automatic “warming up” limit ramp shown above.
                                </InfoTip>
                              </div>
                              <p className="text-[11px] text-secondary-dark mt-0.5 leading-snug">
                                {pool.is_enabled
                                  ? `Active · day ${pool.days_running ?? 0}${pool.messages_sent ? ` · ${pool.messages_sent} sent` : ''}`
                                  : 'Off — build reputation so you land in inbox, not spam.'}
                              </p>
                            </div>
                            {pool.is_enabled ? (
                              <button onClick={() => disableWarmup(acc)} disabled={busy}
                                className="shrink-0 text-xs font-semibold text-secondary-dark hover:text-black-light disabled:opacity-50">
                                {busy ? 'Updating…' : 'Turn off'}
                              </button>
                            ) : (
                              <button onClick={() => setWarmupModalAcc(acc)} disabled={busy}
                                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-primary-light to-primary-dark rounded-lg hover:opacity-90 disabled:opacity-60">
                                {busy ? 'Updating…' : 'Turn on'}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3">
                          {acc.status === 'Issue' ? (
                            // Revoked token: Reconnect is the ONLY sensible action.
                            // Resume flips is_active true without a fresh token, so
                            // the next send re-fails and it bounces back to Issue.
                            <button onClick={() => reconnect(acc)}
                              disabled={connectingGoogle || connectingOutlook}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm disabled:opacity-60">
                              {(connectingGoogle || connectingOutlook)
                                ? <ApplyDirLoader.Button variant="light" />
                                : <RefreshCw className="w-3.5 h-3.5" />} Reconnect
                            </button>
                          ) : (
                            <>
                              <button onClick={() => handleToggle(acc.id)} disabled={togglingId === acc.id}
                                className="text-xs font-semibold text-secondary-dark hover:text-black-light disabled:opacity-50">
                                {togglingId === acc.id ? 'Updating…' : acc.status === 'Paused' ? 'Resume sending' : 'Pause'}
                              </button>
                              {/* A paused inbox may also be stale — always let the
                                  user re-authorise it. (Re-consent upserts the same
                                  row by email; safe and idempotent.) */}
                              {acc.status === 'Paused' && (
                                <button onClick={() => reconnect(acc)}
                                  disabled={connectingGoogle || connectingOutlook}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-dark hover:text-primary-light disabled:opacity-50">
                                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <button onClick={() => setConfirmDelete(acc)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isPendingActivation ? (
              <PendingActivationCard />
            ) : (hasGmail && hasOutlook) ? (
              <p className="text-xs font-semibold text-secondary-dark bg-neutral-light border border-neutral-dark rounded-xl px-3 py-2.5">
                Gmail and Outlook both connected — that's the max during the pilot. Remove one to switch to a different account.
              </p>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                {!hasGmail && (
                  <button onClick={connectGoogle} disabled={connectingGoogle} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-60">
                    {connectingGoogle ? <ApplyDirLoader.Button variant="light" /> : <Mail className="w-4 h-4" />} Connect Gmail with Google
                  </button>
                )}
                {!hasOutlook && (
                  <button onClick={connectOutlook} disabled={connectingOutlook} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-neutral-dark text-black-light text-sm font-semibold rounded-xl hover:border-[#0A66C2]/50 hover:text-[#0A66C2] transition-all disabled:opacity-60">
                    {connectingOutlook ? <ApplyDirLoader.Button /> : <Mail className="w-4 h-4 text-[#0A66C2]" />} Connect Outlook
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-secondary-dark/70 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> One click, no passwords, ever. We can only send introductions you approve and read the replies to them; nothing else in your inbox.</p>
            <p className="text-xs text-secondary-dark leading-relaxed">
              20 introductions a day — about 5 new ones, with the rest going to follow-ups. Most replies come from follow-ups, so that's where the room is reserved.
            </p>
          </>
        )}
      </P>
      </>}

      {show('preferences') && <>
      {/* Section B — Sending preferences */}
      <P title="Sending Preferences" description="Follow-up cadence and automatic sending." icon={Send}>
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
      </P>
      </>}

      {show('signature') && <>
      {/* Section C — Signature preview */}
      <P title="Email Signature Preview" description="Exactly what recipients see at the bottom of every email." icon={FileText}>
        <div className="rounded-xl border border-neutral-dark bg-neutral p-4 font-mono text-xs text-secondary-dark whitespace-pre-wrap break-words leading-relaxed">
          <span>Warm regards,{'\n'}</span>
          <span className="text-black font-semibold">{name}</span>{'\n'}
          <span className="text-black break-all">{email}</span>{link ? <>{'\n'}<span className="text-primary-dark break-all">{link}</span></> : null}
          {'\n\n'}
          <span>{addr}</span>{'\n'}
          <span>Not the right time? Just reply 'stop' and you won't hear from me again.</span>{'\n'}
          <span>Privacy policy: applydir.com/privacy</span>
        </div>
        <p className="text-[11px] text-secondary-dark/60 flex items-center gap-1"><Info className="w-3 h-3" /> Pulls from your Profile (name, sign-off email, Calendly, location). Edit those in the Profile tab.</p>
      </P>
      </>}

      {/* Modals stay unconditional — they are already state-gated, and the
          inbox screen needs every one of them. */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h4 className="text-lg font-bold mb-3 text-black font-montserrat">Remove inbox?</h4>
            <p className="text-sm text-secondary-dark mb-6">This disconnects <strong>{confirmDelete.email}</strong> and stops new sends from it. Its sending history is kept, and you can connect it again anytime. If it still has follow-ups scheduled in active threads, remove is blocked until those have sent — pause it instead.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral hover:bg-neutral-dark transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-consent explainer (Gmail only) — owned by useConnectProvider. */}
      {explainer}

      {/* Warm-up consent — the only place we record warm-up consent, shown both
          by the per-inbox "Turn on" button and the post-connect prompt. */}
      <WarmupConsentModal
        open={!!warmupModalAcc}
        account={warmupModalAcc}
        busy={warmupBusyId === warmupModalAcc?.id}
        onConfirm={confirmWarmup}
        onCancel={() => setWarmupModalAcc(null)}
      />
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

// See ProfileTab for what `only` does.
function JobsTab({ only }) {
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
  const P = only ? SectionPanel : Collapsible;
  const show = (key) => !only || only === key;

  return (
    <>
      {show('industry') && (
      <P title="Industry & Work Arrangement" description="The kind of work you're looking for." icon={Briefcase} defaultOpen>
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
      </P>
      )}

      {show('roles') && (
      <P title="Target Roles & Locations" description="What your headhunter searches for every morning." icon={SlidersHorizontal} defaultOpen>
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
      </P>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Help & FAQ copy.
 *
 * Voice follows ARCHITECTURE.md §4 (the language transformation table) — plain
 * outcomes, no internal vocabulary. Every claim is grounded in behaviour that
 * exists today; see the notes where a nuance is worth knowing:
 *
 *  • Follow-up cadence matches the 3/7/14 tiles in Sending Preferences and
 *    stops on any reply.
 *  • The inbox scopes wording matches the consent line in Connected Inboxes.
 *  • The auto-apply contrast is VISION.md's own framing (§ "What they do":
 *    mass-fill application forms vs email the hiring manager directly).
 *  • The "disconnect" answer covers BOTH paths, because they differ: pausing
 *    just stops sending, while removing is refused (409 from
 *    gmail_account_delete) while follow-ups are still pinned to that inbox.
 */
const FAQ = [
  {
    q: 'How does ApplyDir find hiring managers?',
    a: 'Once you approve a role, we search for the actual decision-maker — not a generic careers inbox — using verified contact sources. You’ll see their name and title before we write anything.',
  },
  {
    q: 'Is it safe to connect my email?',
    a: 'Yes. We only send the introductions you approve and read the replies to them — nothing else in your inbox. We never see your password directly (Google/Outlook sign-in) or store it in plain text.',
  },
  {
    q: 'Why do introductions send from my own email instead of ApplyDir’s?',
    a: 'Hiring managers reply to real people, not company addresses. Sending from your own inbox is why our reply rates are meaningfully higher than mass-apply tools.',
  },
  {
    q: 'What is warm-up, and why does my daily limit start low?',
    a: 'New inboxes can land in spam if they suddenly send a lot of email. We start conservatively and grow your sending volume over about two weeks, which protects your reply rate long-term.',
  },
  {
    q: 'What happens if a hiring manager doesn’t reply?',
    a: 'We follow up automatically on day 3, 7, and 14 in the same email thread, then stop. Any reply — even a “not right now” — ends the sequence immediately.',
  },
  {
    q: 'Can I edit an introduction before it sends?',
    a: 'Yes. Every introduction is drafted for your review — you can edit any part of it before approving.',
  },
  {
    q: 'What happens if I disconnect my email?',
    a: 'Pausing an inbox stops it sending; anything in progress simply waits. Removing an inbox is blocked while it still has follow-ups scheduled in live conversations — pause it instead, or wait for those to send. Either way, nothing sends without a connected, active inbox.',
  },
  {
    q: 'How is this different from auto-apply tools?',
    a: 'Auto-apply tools fill out application forms in bulk. We reach the actual hiring manager directly with a personal introduction — different channel, different result.',
  },
  {
    q: 'How do I deactivate my account?',
    a: 'Go to Settings → Danger Zone. This is permanent, so we ask you to confirm before anything is removed.',
  },
];

function tzOptions() {
  try { if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone'); } catch { /* older browser */ }
  return ['UTC', 'Africa/Lagos', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Dubai'];
}

// See ProfileTab for what `only` does. Note the Danger Zone is NOT part of
// `only` — on mobile it lives inline at the bottom of the Level 1 list rather
// than behind a row, so it can't be reached by a stray tap.
function AccountTab({ navigate, only }) {
  const qc = useQueryClient();
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

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const P = only ? SectionPanel : Collapsible;
  const show = (key) => !only || only === key;
  // The merged mobile Notifications screen stacks two panels, so each needs its
  // own heading — the route header alone can't label both.
  const dual = only === 'notifications';

  return (
    <>
      {show('subscription') && (
      /* Subscription */
      <P title="Subscription" description="Your current plan." icon={Crown} defaultOpen
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
      </P>
      )}

      {show('login') && (
      /* Login */
      <P title="Login & Password" description="Your sign-in details." icon={KeyRound}>
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
        {me?.has_password === false ? (
          /* Google-only so far — no password exists to "change". The reset
             link doubles as the set-a-password path (proves mailbox ownership). */
          <div className="flex items-center justify-between gap-3 flex-wrap bg-neutral rounded-xl border border-neutral-dark px-4 py-3">
            <p className="text-sm text-secondary-dark">You sign in with Google. Want a password too? Set one via email — then either method works.</p>
            <button onClick={sendReset} disabled={sendingReset} className="text-xs font-semibold text-primary-dark hover:text-primary-light disabled:opacity-60 shrink-0">{sendingReset ? 'Sending…' : 'Email me a set-password link'}</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div><Label>Current password</Label><Input type="password" value={cur} onChange={e => setCur(e.target.value)} autoComplete="current-password" /></div>
              <div><Label>New password</Label><Input type="password" value={nxt} onChange={e => setNxt(e.target.value)} autoComplete="new-password" /></div>
              <div><Label>Confirm new</Label><Input type="password" value={cfm} onChange={e => setCfm(e.target.value)} autoComplete="new-password" /></div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button onClick={sendReset} disabled={sendingReset} className="text-xs font-semibold text-primary-dark hover:text-primary-light disabled:opacity-60">{sendingReset ? 'Sending…' : 'Forgot password? Email me a reset link'}</button>
              <SaveButton onClick={savePassword} saving={savingPw} disabled={!cur || !nxt || !cfm}>Update Password</SaveButton>
            </div>
          </>
        )}
      </P>
      )}

      {show('notifications') && (
      /* Notifications */
      <P title="Notifications" description="Optional emails and your timezone." icon={Bell} showTitle={dual}>
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
      </P>
      )}

      {show('notifications') && (
      /* Push notifications (this device) — merged onto the same mobile screen
         as the email notifications above. */
      <P title="Push notifications" description="Get pinged on your phone or desktop." icon={Bell} showTitle={dual}>
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
      </P>
      )}

      {show('privacy') && (
      /* Data & privacy */
      <P title="Data & Privacy" description="Export your data or view our policies." icon={ShieldCheck}>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadData} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold transition-all"><Download className="w-4 h-4" /> Download my data</button>
          <a href="/privacy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-dark text-secondary-dark text-sm font-semibold hover:text-black-light transition-all"><ShieldCheck className="w-4 h-4" /> Privacy policy</a>
        </div>
        <div className="pt-2"><LegalSections /></div>
      </P>
      )}

      {show('about') && (
      /* About */
      <P title="About" description="App version and support." icon={Info}>
        <div className="text-sm text-secondary-dark space-y-1">
          <p>ApplyDir <span className="text-black-light font-semibold">v1.0</span></p>
          <p><a href="mailto:atoyebijoshua095@gmail.com" className="text-primary-dark font-semibold hover:underline">Support & feedback</a></p>
          <p className="text-xs text-secondary-dark/60 pt-1">Built with <span className="text-red-500">♥</span> by Jatotech</p>
        </div>
      </P>
      )}

      {show('help') && (
      /* Help & FAQ — one Collapsible per question, all closed by default. */
      <P title="Help & FAQ" description="How ApplyDir works, answered." icon={HelpCircle}>
        <div className="space-y-2.5">
          {FAQ.map(({ q, a }) => (
            <Collapsible key={q} title={q}>
              <p className="text-sm text-secondary-dark leading-relaxed">{a}</p>
            </Collapsible>
          ))}
        </div>
        <div className="text-sm text-secondary-dark pt-1">
          <p>Still stuck? <a href="mailto:atoyebijoshua095@gmail.com" className="text-primary-dark font-semibold hover:underline">Email us</a> — a real person answers.</p>
        </div>
      </P>
      )}

      {/* Danger zone — desktop only from here. On mobile it is rendered inline
          at the bottom of the Level 1 list instead of behind a row. */}
      {!only && <DangerZone navigate={navigate} />}
    </>
  );
}

/*
 * DangerZone — sign out + permanent account deletion.
 *
 * Extracted from AccountTab verbatim so the mobile Level 1 list can render it
 * at its bottom without a route of its own. Markup is byte-for-byte what
 * AccountTab used to render; `showSignOut` (default true, i.e. desktop) is the
 * only addition — mobile hides the inline sign-out row because the list already
 * carries a standalone "Sign out" row above this card.
 */
export function DangerZone({ navigate, showSignOut = true }) {
  const { logout } = useAuth();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const [confirmText, setConfirmText] = useState(''); const [delPw, setDelPw] = useState(''); const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 md:py-5 border-b border-red-100 bg-red-50/40">
        <h3 className="text-base md:text-lg font-bold font-montserrat text-red-700">Danger Zone</h3>
        <p className="text-xs md:text-sm text-red-600/70 mt-0.5">{showSignOut ? 'Sign out or permanently delete your account.' : 'Permanently delete your account.'}</p>
      </div>
      <div className="px-5 md:px-6 py-5 space-y-4">
        {showSignOut && (
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-secondary-dark">End your session on this device.</p>
              <button onClick={handleLogout} className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl transition-all"><LogOut className="w-4 h-4" /> Sign Out</button>
            </div>
            <div className="h-px bg-red-100" />
          </>
        )}
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Deleting is permanent — profile, jobs, contacts, emails, and inboxes are all erased. Connected inboxes stop sending immediately.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={me?.has_password === false ? 'sm:col-span-2' : ''}><Label>Type DELETE to confirm</Label><Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" /></div>
          {me?.has_password !== false && (
            <div><Label>Your password</Label><Input type="password" value={delPw} onChange={e => setDelPw(e.target.value)} placeholder="Required to delete your account" autoComplete="current-password" /></div>
          )}
        </div>
        <div className="flex justify-end">
          <button onClick={handleDelete} disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE' || (me?.has_password !== false && !delPw)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-200 transition-all disabled:opacity-50">
            {deleting ? <ApplyDirLoader.Button variant="light" /> : <Trash2 className="w-4 h-4" />} Permanently delete my account
          </button>
        </div>
      </div>
    </div>
  );
}

// The four tab bodies are exported so the mobile route can render ONE section
// of one of them per screen (see SettingsMobile.jsx).
export { ProfileTab, SendingTab, JobsTab, AccountTab };

export default Settings;
