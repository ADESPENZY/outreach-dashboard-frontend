import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, AlertTriangle, LogOut, Save, Loader2, Lock,
  ChevronRight, ArrowRight, Trash2, KeyRound, FileText, AtSign, Bell, Clock,
} from 'lucide-react';
import { getMe, changePassword, deleteAccount, forgotPassword, setUsername } from '@/services/apiAuth';
import { getProfile, updateProfile } from '@/services/apiProfile';
import { useAuth } from '@/context/AuthContext';

// ─── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'account', label: 'Account',       icon: User,          desc: 'Login & password' },
  { key: 'prefs',   label: 'Notifications', icon: Bell,          desc: 'Emails & timezone' },
  { key: 'legal',   label: 'Legal',         icon: Shield,        desc: 'Privacy & terms' },
  { key: 'danger',  label: 'Danger Zone',   icon: AlertTriangle, desc: 'Delete account' },
];

// ─── Shared bits ─────────────────────────────────────────────────────────────
function Card({ title, description, children, danger }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${danger ? 'border-red-200' : 'border-neutral-dark'}`}>
      <div className={`px-6 py-5 border-b ${danger ? 'border-red-100 bg-red-50/40' : 'border-neutral-dark'}`}>
        <h3 className={`text-base font-bold font-montserrat ${danger ? 'text-red-700' : 'text-black'}`}>{title}</h3>
        {description && <p className={`text-sm mt-0.5 ${danger ? 'text-red-600/70' : 'text-secondary-dark'}`}>{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const navigate = useNavigate();

  return (
    <div className="px-4 md:px-0 pt-4 md:pt-6 pb-10 animate-fade-in font-roboto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">Settings</h1>
        <p className="text-sm text-secondary-dark mt-1">Your login, legal policies, and account controls.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Nav — 2×2 grid on mobile (all four tabs visible, nothing clipped),
            vertical sidebar on desktop. Mobile hides the descriptions so each
            tab is a compact icon + label and the content sits right beneath. */}
        <aside className="w-full md:w-56 shrink-0 md:sticky md:top-4">
          <nav className="bg-white rounded-2xl border border-neutral-dark shadow-sm grid grid-cols-2 md:flex md:flex-col overflow-hidden">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isDanger = tab.key === 'danger';
              // Mobile (2-col grid) dividers: right border on left column, bottom
              // border on the top row. Desktop overrides to a single bottom border.
              const isLeftCol = i % 2 === 0;
              const isTopRow  = i < 2;
              const gridBorders = `${isLeftCol ? 'border-r' : ''} ${isTopRow ? 'border-b' : ''} md:border-r-0 ${i < TABS.length - 1 ? 'md:border-b' : 'md:border-b-0'}`;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 md:gap-3 px-4 py-3 md:py-3.5 text-left transition-all border-neutral-dark ${gridBorders} ${
                    isActive
                      ? isDanger ? 'bg-red-50 md:border-l-2 md:border-l-red-400 text-red-600' : 'bg-primary-light/8 md:border-l-2 md:border-l-primary-light text-primary-dark'
                      : isDanger ? 'text-red-500 hover:bg-red-50/50' : 'text-secondary-dark hover:bg-neutral hover:text-black-light'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive && !isDanger ? 'text-primary-light' : ''}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{tab.label}</p>
                    <p className={`hidden md:block text-[10px] ${isActive ? '' : 'text-secondary-dark/60'}`}>{tab.desc}</p>
                  </div>
                  {isActive && <ChevronRight className="hidden md:block w-3.5 h-3.5 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-5">
          {activeTab === 'account' && <AccountTab navigate={navigate} />}
          {activeTab === 'prefs'   && <NotificationsTab />}
          {activeTab === 'legal'   && <LegalTab />}
          {activeTab === 'danger'  && <DangerTab navigate={navigate} />}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNT — login info + change password
// ═════════════════════════════════════════════════════════════════════════════
function AccountTab({ navigate }) {
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving]   = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Username — editable, reuses the set-username endpoint (format + uniqueness checked server-side)
  const [username, setUname]  = useState('');
  const [savingUname, setSavingUname] = useState(false);
  useEffect(() => { if (me?.username) setUname(me.username); }, [me?.username]);

  const usernameChanged = username.trim() !== (me?.username || '');
  const usernameValid   = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());

  const submitUsername = async () => {
    if (!usernameValid) return toast.error('3–20 characters. Letters, numbers, and underscores only.');
    setSavingUname(true);
    try {
      await setUsername(username.trim());
      toast.success('Username updated. Use it next time you sign in.');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) { toast.error(err.message); }
    finally { setSavingUname(false); }
  };

  const submitPassword = async () => {
    if (next.length < 8) return toast.error('New password must be at least 8 characters.');
    if (next !== confirm) return toast.error('New passwords do not match.');
    setSaving(true);
    try {
      await changePassword({ current_password: current, new_password: next });
      toast.success('Password updated.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const sendReset = async () => {
    if (!me?.email) return;
    setSendingReset(true);
    try {
      await forgotPassword(me.email);
      toast.success(`Reset link sent to ${me.email}.`);
    } catch (err) { toast.error(err.message); }
    finally { setSendingReset(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary-light" /></div>;

  const initials = (me?.first_name || me?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-light/30 shrink-0">{initials}</div>
        <div>
          <p className="text-lg font-bold text-black font-montserrat">{me?.first_name || me?.username}</p>
          <p className="text-sm text-secondary-dark">{me?.email}</p>
          <p className="text-xs text-secondary-dark/60 mt-0.5">@{me?.username}</p>
        </div>
      </div>

      {/* Username — the name you sign in with */}
      <Card title="Username" description="This is the name you log in with. Changing it takes effect on your next sign-in.">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider">Username</label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-secondary-dark/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={username}
                onChange={e => setUname(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
              />
            </div>
            {username && !usernameValid && (
              <p className="text-[11px] text-red-500 mt-1">3–20 characters · letters, numbers, underscores only.</p>
            )}
          </div>
          <button
            onClick={submitUsername}
            disabled={savingUname || !usernameChanged || !usernameValid}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {savingUname ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </Card>

      {/* Profile pointer — no duplicate editing here */}
      <button
        onClick={() => navigate('/dashboard/profile')}
        className="w-full bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-4 flex items-center justify-between hover:border-primary-light/40 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary-dark" /></div>
          <div>
            <p className="text-sm font-semibold text-black">Your outreach identity & CV</p>
            <p className="text-xs text-secondary-dark">Name, projects, Calendly, skills and CV live in your Profile.</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-secondary-dark/50" />
      </button>

      {/* Change password */}
      <Card title="Change Password" description="Use at least 8 characters.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider">Current</label>
            <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider">New</label>
            <Input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="New password" autoComplete="new-password" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider">Confirm</label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <button onClick={sendReset} disabled={sendingReset} className="text-xs font-semibold text-primary-dark hover:text-primary-light disabled:opacity-60">
            {sendingReset ? 'Sending…' : 'Forgot your current password? Email me a reset link'}
          </button>
          <button
            onClick={submitPassword}
            disabled={saving || !current || !next || !confirm}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Update Password
          </button>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — optional email streams + timezone
// ═════════════════════════════════════════════════════════════════════════════
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary-light' : 'bg-neutral-dark'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function PrefRow({ icon: Icon, title, desc, checked, onChange, saving }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary-dark" /></div>
        <div>
          <p className="text-sm font-semibold text-black">{title}</p>
          <p className="text-xs text-secondary-dark">{desc}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={saving} />
    </div>
  );
}

// IANA timezone list — browsers expose the full set; fall back to a short list.
function tzOptions() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone');
  } catch { /* older browser */ }
  return ['UTC', 'Africa/Lagos', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Dubai'];
}

function NotificationsTab() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const [scout, setScout]   = useState(true);
  const [nudge, setNudge]   = useState(true);
  const [tz, setTz]         = useState('UTC');
  const [savingPref, setSavingPref] = useState(false);
  const [savingTz, setSavingTz]     = useState(false);

  useEffect(() => {
    if (!profile) return;
    setScout(profile.notify_scout_digest ?? true);
    setNudge(profile.notify_pipeline_nudges ?? true);
    setTz(profile.timezone || 'UTC');
  }, [profile]);

  const savePref = async (patch, setLocal, prev) => {
    setSavingPref(true);
    try {
      await updateProfile(patch);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      setLocal(prev);          // revert optimistic toggle
      toast.error(err.message);
    } finally { setSavingPref(false); }
  };

  const saveTz = async (value) => {
    setTz(value);
    setSavingTz(true);
    try {
      await updateProfile({ timezone: value });
      toast.success('Timezone saved.');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) { toast.error(err.message); }
    finally { setSavingTz(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary-light" /></div>;

  if (!profile) {
    return (
      <Card title="Notifications" description="Finish setting up your profile first.">
        <p className="text-sm text-secondary-dark">Upload your CV on the Profile page to unlock notification preferences.</p>
      </Card>
    );
  }

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-5">
      <Card title="Email notifications" description="Choose which optional emails we send you. Essential account emails (password reset, security) are always sent.">
        <PrefRow
          icon={Bell}
          title="Daily scout digest"
          desc="A morning summary of the new roles Auto-Scout matched to your CV."
          checked={scout}
          saving={savingPref}
          onChange={(v) => { setScout(v); savePref({ notify_scout_digest: v }, setScout, !v); }}
        />
        <div className="h-px bg-neutral-dark/60" />
        <PrefRow
          icon={ArrowRight}
          title="Re-engagement nudges"
          desc="An occasional reminder when you have jobs or contacts waiting on a next step."
          checked={nudge}
          saving={savingPref}
          onChange={(v) => { setNudge(v); savePref({ notify_pipeline_nudges: v }, setNudge, !v); }}
        />
      </Card>

      <Card title="Timezone" description="Used to schedule sends and time your digest for your local morning.">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-primary-dark" /></div>
          <select
            value={tz}
            onChange={(e) => saveTz(e.target.value)}
            disabled={savingTz}
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all disabled:opacity-60"
          >
            {tzOptions().map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
          {savingTz && <Loader2 className="w-4 h-4 animate-spin text-primary-light" />}
        </div>
        {browserTz && tz !== browserTz && (
          <button onClick={() => saveTz(browserTz)} className="text-xs font-semibold text-primary-dark hover:underline mt-1">
            Use my device timezone ({browserTz.replace(/_/g, ' ')})
          </button>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEGAL — real, ApplyDir-specific policies
// ═════════════════════════════════════════════════════════════════════════════
function LegalTab() {
  return (
    <div className="space-y-5">
      <Card title="Privacy Policy" description={`Last updated ${new Date().getFullYear()}. Plain-language summary of how ApplyDir handles your data.`}>
        <Policy heading="What we collect">
          <li><b>Account</b> — your email, username, and (for password sign-ups) a securely hashed password.</li>
          <li><b>Profile</b> — your CV text, contact details, links, Calendly, and AI-extracted skills/projects.</li>
          <li><b>Connected inboxes</b> — the Gmail address and an app password, stored <b>encrypted</b> (Fernet), used only to send your outreach.</li>
          <li><b>Generated content & activity</b> — the jobs, contacts, emails, and CVs the system creates for you, plus open/reply events.</li>
        </Policy>
        <Policy heading="How we use it">
          <li>To find roles, score them against your CV, find contacts, and write & send <b>your</b> cold emails and tailored CVs.</li>
          <li>To send you product emails (welcome, daily scout digest, re-engagement). We never use your connected inbox for our own marketing.</li>
        </Policy>
        <Policy heading="Who we share it with (processors only — we never sell your data)">
          <li><b>OpenAI</b> — CV scoring, email & CV generation.</li>
          <li><b>Apify, Hunter, Apollo, Serper</b> — job scraping & contact discovery.</li>
          <li><b>Google / Gmail</b> — sending your emails via SMTP from your own inbox.</li>
          <li><b>Resend</b> — our transactional emails to you.</li>
          <li><b>Supabase, Render, Vercel</b> — database & hosting.</li>
        </Policy>
        <Policy heading="Your Gmail data">
          <li>We store your app password encrypted and use it <b>solely to send</b> email on your behalf. We do not read your inbox. You can disconnect an inbox at any time from <b>Inboxes</b>.</li>
        </Policy>
        <Policy heading="Your rights">
          <li>View & edit everything in <b>Profile</b>. Export your CV as PDF. <b>Delete your account</b> any time (Settings → Danger Zone) — this permanently erases your data. We retain your data only until you delete your account.</li>
        </Policy>
      </Card>

      <Card title="Terms of Service" description="The deal between you and ApplyDir.">
        <Policy heading="Your responsibilities">
          <li>You own (or are authorized to use) every inbox you connect.</li>
          <li>You are responsible for the emails you send and for complying with anti-spam and privacy law in your and your recipients' jurisdictions (e.g. CAN-SPAM, GDPR, CASL) and with Google's terms.</li>
          <li>No purchased lists, spam, harassment, deception, or illegal content. Outreach must be genuine and relevant.</li>
        </Policy>
        <Policy heading="Positioning & representations">
          <li>Tools that help you present as a fractional/contract engineer are aids only. You are responsible for the accuracy of your CV, your claims, and any agreement you enter with a company.</li>
        </Policy>
        <Policy heading="No guarantees">
          <li>ApplyDir is a tool, not an employment agency. We don't guarantee interviews, offers, or any outcome. Deliverability depends on your sending behaviour and inbox reputation.</li>
        </Policy>
        <Policy heading="Acceptable use & suspension">
          <li>We may pause or remove accounts that abuse the system, spam, or threaten the deliverability of the shared sending pool.</li>
        </Policy>
        <Policy heading="Service & liability">
          <li>The service is provided "as is" and relies on third-party APIs that may change or fail. To the extent permitted by law, our liability is limited to the fees you paid in the prior month.</li>
        </Policy>
      </Card>

      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-neutral border border-neutral-dark">
        <Shield className="w-4 h-4 text-secondary-dark/60 mt-0.5 shrink-0" />
        <p className="text-xs text-secondary-dark">
          This is a plain-language summary written for clarity, not legal advice. Have it reviewed by counsel before public launch. Questions: <a href="mailto:support@applydir.com" className="font-semibold text-primary-dark hover:underline">support@applydir.com</a>.
        </p>
      </div>
    </div>
  );
}

function Policy({ heading, children }) {
  return (
    <div>
      <p className="text-sm font-bold text-black-light mb-1.5">{heading}</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-secondary-dark leading-relaxed">{children}</ul>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DANGER ZONE — sign out + real account deletion
// ═════════════════════════════════════════════════════════════════════════════
function DangerTab({ navigate }) {
  const { logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword]       = useState('');
  const [deleting, setDeleting]       = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out.');
    setTimeout(() => navigate('/', { replace: true }), 400);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount({ password, confirm: confirmText });
      toast.success('Your account and all data have been deleted.');
      // Best-effort local cleanup, then bounce to login.
      try { await logout(); } catch { /* token may already be gone */ }
      localStorage.clear();
      setTimeout(() => navigate('/', { replace: true }), 600);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sign out */}
      <Card title="Sign Out" description="End your session on this device." danger>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-secondary-dark">You'll need to sign back in to access the dashboard.</p>
          <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-neutral hover:bg-neutral-dark text-black-light text-sm font-semibold rounded-xl transition-all shrink-0">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </Card>

      {/* Delete account */}
      <Card title="Delete Account" description="Permanent. This erases your profile, jobs, contacts, emails, inboxes, and warmup — everything." danger>
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          This cannot be undone. Connected inboxes will stop sending immediately.
        </div>
        <div>
          <label className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider">Type <span className="text-red-600">DELETE</span> to confirm</label>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider">Your password</label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (leave blank if you use Google sign-in)" autoComplete="current-password" />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-200 transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Permanently delete my account
          </button>
        </div>
      </Card>
    </div>
  );
}

export default Settings;
