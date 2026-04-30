import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  User, Send, Flame, Zap, AlertTriangle, LogOut, Save,
  CheckCircle, XCircle, Loader2, Mail, Shield, Clock,
  ChevronRight, ExternalLink, ToggleLeft, ToggleRight,
  Key, RefreshCw, Briefcase, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '@/services/apiAuth';
import { getProfile, updateProfile } from '@/services/apiProfile';
import { getGmailAccounts } from '@/services/apiGmail';
import { getHunterQuota } from '@/services/apiOutreach';

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'account',      label: 'Account',      icon: User,          desc: 'Profile & identity' },
  { key: 'outreach',     label: 'Outreach',      icon: Send,          desc: 'Email & follow-ups' },
  { key: 'warmup',       label: 'Warmup',        icon: Flame,         desc: 'Sending defaults' },
  { key: 'integrations', label: 'Integrations',  icon: Zap,           desc: 'API connections' },
  { key: 'danger',       label: 'Danger Zone',   icon: AlertTriangle, desc: 'Risk actions' },
];

// ─── Shared sub-components ────────────────────────────────────────────────────
function SectionCard({ title, description, children, onSave, saving, noPad }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-dark">
        <h3 className="text-base font-bold text-black font-montserrat">{title}</h3>
        {description && <p className="text-sm text-secondary-dark mt-0.5">{description}</p>}
      </div>
      <div className={noPad ? '' : 'px-6 py-5 space-y-4'}>
        {children}
      </div>
      {onSave && (
        <div className="px-6 py-4 border-t border-neutral-dark bg-neutral/40 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-light to-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
      <div className="md:w-44 shrink-0 pt-0.5">
        <p className="text-sm font-semibold text-black-light">{label}</p>
        {hint && <p className="text-xs text-secondary-dark mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function InputField({ value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
        readOnly
          ? 'bg-neutral border-neutral-dark text-secondary-dark cursor-not-allowed'
          : 'bg-white border-neutral-dark focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 text-black'
      }`}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-primary-light' : 'bg-secondary-dark/30'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-neutral-dark bg-white text-sm text-black outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition-all"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function NumberStepper({ value, onChange, min = 1, max = 100 }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-lg border border-neutral-dark bg-white text-secondary-dark hover:bg-neutral hover:border-primary-light/40 transition-all font-bold text-lg leading-none flex items-center justify-center"
      >−</button>
      <span className="w-12 text-center text-sm font-bold text-black">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-lg border border-neutral-dark bg-white text-secondary-dark hover:bg-neutral hover:border-primary-light/40 transition-all font-bold text-lg leading-none flex items-center justify-center"
      >+</button>
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const navigate = useNavigate();

  return (
    <div className="pb-10 animate-fade-in font-roboto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">
          Settings
        </h1>
        <p className="text-sm text-secondary-dark mt-1">Manage your account, preferences, and integrations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ── Left Tab Nav ─────────────────────────────────────── */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isDanger = tab.key === 'danger';
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                    i < TABS.length - 1 ? 'border-b border-neutral-dark' : ''
                  } ${
                    isActive
                      ? isDanger
                        ? 'bg-red-50 border-l-2 border-l-red-400 text-red-600'
                        : 'bg-primary-light/8 border-l-2 border-l-primary-light text-primary-dark'
                      : isDanger
                        ? 'text-red-500 hover:bg-red-50/50'
                        : 'text-secondary-dark hover:bg-neutral hover:text-black-light'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive && !isDanger ? 'text-primary-light' : ''}`} />
                  <div>
                    <p className={`text-sm font-semibold`}>{tab.label}</p>
                    <p className={`text-[10px] ${isActive ? '' : 'text-secondary-dark/60'}`}>{tab.desc}</p>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Right Content ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {activeTab === 'account'      && <AccountTab />}
          {activeTab === 'outreach'     && <OutreachTab />}
          {activeTab === 'warmup'       && <WarmupTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'danger'       && <DangerTab navigate={navigate} />}
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// TAB — ACCOUNT
// ═════════════════════════════════════════════════════════════════════════════

function AccountTab() {
  const queryClient = useQueryClient();

  const [fullName,      setFullName]      = useState('');
  const [contactEmail,  setContactEmail]  = useState('');
  const [phone,         setPhone]         = useState('');
  const [location,      setLocation]      = useState('');
  const [linkedinUrl,   setLinkedinUrl]   = useState('');
  const [githubUrl,     setGithubUrl]     = useState('');
  const [portfolioUrl,  setPortfolioUrl]  = useState('');

  const { data: accountData, isLoading: loading } = useQuery({
    queryKey: ['account-settings'],
    queryFn: () => Promise.all([getMe(), getProfile()]).then(([me, profile]) => ({ me, profile })),
  });

  useEffect(() => {
    if (!accountData) return;
    const { profile } = accountData;
    setFullName(profile?.full_name || '');
    setContactEmail(profile?.contact_email || '');
    setPhone(profile?.phone || '');
    setLocation(profile?.location || '');
    setLinkedinUrl(profile?.linkedin_url || '');
    setGithubUrl(profile?.github_url || '');
    setPortfolioUrl(profile?.portfolio_url || '');
  }, [accountData]);

  const saveMutation = useMutation({
    mutationFn: (profileData) => updateProfile(profileData),
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['account-settings'] });
    },
    onError: () => toast.error('Failed to save profile'),
  });

  const handleSave = () => saveMutation.mutate({
    full_name: fullName, contact_email: contactEmail,
    phone, location,
    linkedin_url: linkedinUrl, github_url: githubUrl, portfolio_url: portfolioUrl,
  });

  const me = accountData?.me;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-primary-light" />
    </div>
  );

  const initials = (fullName || me?.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const displayEmail = contactEmail || me?.email || '';

  return (
    <div className="space-y-5">
      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm px-6 py-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-light/30 shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-lg font-bold text-black font-montserrat">{fullName || me?.username}</p>
          <p className="text-sm text-secondary-dark">{displayEmail}</p>
          <p className="text-xs text-secondary-dark/60 mt-0.5">@{me?.username}</p>
        </div>
      </div>

      {/* Auth info — read only */}
      <SectionCard title="Login Details" description="Your system username — contact admin to change.">
        <FieldRow label="Username">
          <InputField value={me?.username || ''} readOnly />
        </FieldRow>
      </SectionCard>

      {/* Contact info — used in CVs and outreach */}
      <SectionCard
        title="Contact Info"
        description="Shown on your generated CVs and used in outreach signatures."
        onSave={handleSave}
        saving={saveMutation.isPending}
      >
        <FieldRow label="Full Name" hint="Used in CV header and signatures">
          <InputField
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Joshua Atoyebi"
          />
        </FieldRow>
        <FieldRow label="Contact Email" hint="Shown on your CV (can differ from login email)">
          <InputField
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="e.g. atoyebijoshua095@gmail.com"
          />
        </FieldRow>
        <FieldRow label="Phone" hint="Shown on CV sidebar">
          <InputField
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. +234 912 872 1745"
          />
        </FieldRow>
        <FieldRow label="Location" hint="City, Country">
          <InputField
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Lagos, Nigeria"
          />
        </FieldRow>
      </SectionCard>

      {/* Links */}
      <SectionCard
        title="Links"
        description="Shown on your CV sidebar."
        onSave={handleSave}
        saving={saveMutation.isPending}
      >
        <FieldRow label="LinkedIn" hint="Full URL">
          <InputField
            value={linkedinUrl}
            onChange={e => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/joshuaatoyebi"
          />
        </FieldRow>
        <FieldRow label="GitHub" hint="Full URL">
          <InputField
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            placeholder="https://github.com/ADESPENZY"
          />
        </FieldRow>
        <FieldRow label="Portfolio" hint="Full URL">
          <InputField
            value={portfolioUrl}
            onChange={e => setPortfolioUrl(e.target.value)}
            placeholder="https://www.gojatotech.com"
          />
        </FieldRow>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB — OUTREACH
// ═════════════════════════════════════════════════════════════════════════════

const OUTREACH_DEFAULTS = {
  defaultAccountId: '',
  followup1Days: 3,
  followup2Days: 7,
  maxFollowups: 2,
  dryRun: true,
};

function OutreachTab() {
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem('outreach_prefs');
    return saved ? { ...OUTREACH_DEFAULTS, ...JSON.parse(saved) } : OUTREACH_DEFAULTS;
  });

  const { data: outreachSettingsData, isLoading: loading } = useQuery({
    queryKey: ['outreach-tab-settings'],
    queryFn: async () => {
      const [accsData, quota] = await Promise.all([
        getGmailAccounts(),
        getHunterQuota().catch(() => null),
      ]);
      return { accounts: accsData?.results ?? [], quota };
    },
  });

  const accounts = outreachSettingsData?.accounts ?? [];
  const quota    = outreachSettingsData?.quota ?? null;

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    localStorage.setItem('outreach_prefs', JSON.stringify(prefs));
    toast.success('Outreach preferences saved');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-primary-light" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* From email */}
      <SectionCard
        title="Sending Account"
        description="Default Gmail account used for cold email campaigns."
        onSave={handleSave}
      >
        <FieldRow label="Default From" hint="Which inbox to send from">
          <SelectField
            value={prefs.defaultAccountId}
            onChange={v => set('defaultAccountId', v)}
            placeholder="Select an inbox..."
            options={accounts.map(a => ({ value: String(a.id), label: a.email }))}
          />
        </FieldRow>
        {accounts.length === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            No Gmail accounts connected yet. <a href="/dashboard/connectedAccounts" className="font-semibold underline">Add one →</a>
          </p>
        )}
      </SectionCard>

      {/* Follow-up schedule */}
      <SectionCard
        title="Follow-up Schedule"
        description="When to send automatic follow-up emails after the initial send."
        onSave={handleSave}
      >
        <FieldRow label="Follow-up 1" hint="Days after initial send">
          <NumberStepper value={prefs.followup1Days} onChange={v => set('followup1Days', v)} min={1} max={30} />
        </FieldRow>
        <FieldRow label="Follow-up 2" hint="Days after follow-up 1">
          <NumberStepper value={prefs.followup2Days} onChange={v => set('followup2Days', v)} min={1} max={30} />
        </FieldRow>
        <FieldRow label="Max Follow-ups" hint="How many follow-ups to send">
          <SelectField
            value={String(prefs.maxFollowups)}
            onChange={v => set('maxFollowups', Number(v))}
            options={[
              { value: '1', label: '1 follow-up' },
              { value: '2', label: '2 follow-ups' },
            ]}
          />
        </FieldRow>
      </SectionCard>

      {/* Hunter.io quota */}
      <SectionCard title="Hunter.io Quota" description="Live usage from your Hunter.io plan.">
        {quota ? (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-secondary-dark/60 uppercase tracking-wider font-semibold mb-1">Plan</p>
              <p className="text-sm font-bold text-black capitalize">{quota.plan}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-dark/60 uppercase tracking-wider font-semibold mb-1">Remaining</p>
              <p className="text-sm font-bold text-black">{quota.searches_remaining} / {quota.searches_limit}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-dark/60 uppercase tracking-wider font-semibold mb-1">Mode</p>
              <StatusPill ok={!quota.dry_run} label={quota.dry_run ? 'Dry Run' : 'Live'} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-secondary-dark/60">Could not fetch Hunter.io quota.</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-black-light">Dry Run Mode</p>
            <p className="text-xs text-secondary-dark">When on, contacts are found but emails are not sent. Toggle off in your backend <code className="bg-neutral-dark px-1 rounded text-xs">.env</code> file.</p>
          </div>
          <div>
            <StatusPill ok={quota?.dry_run === false} label={quota?.dry_run ? 'Active (no real sends)' : 'Off — sending live'} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB — WARMUP
// ═════════════════════════════════════════════════════════════════════════════

const WARMUP_DEFAULTS = {
  strategy: 'balanced',
  initialLimit: 5,
  maxLimit: 50,
  dailyIncrease: 3,
  autoIncrease: true,
};

function WarmupTab() {
  const [prefs, setPrefs] = useState(WARMUP_DEFAULTS);

  useEffect(() => {
    const saved = localStorage.getItem('warmup_defaults');
    if (saved) setPrefs({ ...WARMUP_DEFAULTS, ...JSON.parse(saved) });
  }, []);

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    localStorage.setItem('warmup_defaults', JSON.stringify(prefs));
    toast.success('Warmup defaults saved');
  };

  const strategyDescriptions = {
    conservative: 'Start slow, increase by 2/day. Best for brand new accounts.',
    balanced:     'Moderate ramp. Good for most accounts.',
    aggressive:   'Fast ramp. For established accounts with history.',
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Default Strategy"
        description="These values pre-fill when you add a new warmup session."
        onSave={handleSave}
      >
        {/* Strategy pills */}
        <FieldRow label="Ramp Strategy" hint="How fast to increase volume">
          <div className="flex gap-2 flex-wrap">
            {['conservative', 'balanced', 'aggressive'].map(s => (
              <button
                key={s}
                onClick={() => set('strategy', s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all capitalize ${
                  prefs.strategy === s
                    ? 'bg-primary-light text-white border-primary-light shadow-md shadow-primary-light/20'
                    : 'bg-white border-neutral-dark text-secondary-dark hover:border-primary-light/40 hover:text-primary-dark'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {prefs.strategy && (
            <p className="text-xs text-secondary-dark mt-2">{strategyDescriptions[prefs.strategy]}</p>
          )}
        </FieldRow>

        <FieldRow label="Initial Daily Limit" hint="Emails sent on day 1">
          <NumberStepper value={prefs.initialLimit} onChange={v => set('initialLimit', v)} min={1} max={50} />
        </FieldRow>

        <FieldRow label="Max Daily Limit" hint="Target ceiling to ramp up to">
          <NumberStepper value={prefs.maxLimit} onChange={v => set('maxLimit', v)} min={10} max={200} />
        </FieldRow>

        <FieldRow label="Daily Increase" hint="Emails added per day">
          <NumberStepper value={prefs.dailyIncrease} onChange={v => set('dailyIncrease', v)} min={1} max={20} />
        </FieldRow>

        <FieldRow label="Auto-Increase" hint="Automatically raise limit each day">
          <div className="flex items-center gap-3">
            <Toggle checked={prefs.autoIncrease} onChange={v => set('autoIncrease', v)} />
            <span className="text-sm text-secondary-dark">{prefs.autoIncrease ? 'Enabled' : 'Disabled'}</span>
          </div>
        </FieldRow>
      </SectionCard>

      {/* Preview card */}
      <div className="bg-gradient-to-br from-primary-light/5 to-primary-dark/5 rounded-2xl border border-primary-light/20 p-6">
        <h3 className="text-sm font-bold text-primary-dark font-montserrat mb-3">Ramp Preview</h3>
        <div className="flex gap-1 items-end h-16">
          {Array.from({ length: 10 }).map((_, i) => {
            const h = Math.min(prefs.maxLimit, prefs.initialLimit + prefs.dailyIncrease * i);
            const pct = Math.round((h / prefs.maxLimit) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-primary-dark to-primary-light transition-all"
                  style={{ height: `${pct}%`, minHeight: '4px' }}
                />
                <span className="text-[9px] text-secondary-dark/60">D{i + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-secondary-dark mt-2">
          Reaches max ({prefs.maxLimit}/day) in ~{Math.ceil((prefs.maxLimit - prefs.initialLimit) / prefs.dailyIncrease)} days
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB — INTEGRATIONS
// ═════════════════════════════════════════════════════════════════════════════

const INTEGRATIONS = [
  {
    name: 'Hunter.io',
    description: 'Contact enrichment — finds emails from job listings.',
    icon: '🔍',
    status: 'configured',
    detail: 'API key set in environment.',
    action: null,
  },
  {
    name: 'OpenAI',
    description: 'Powers cold email generation and job fit scoring via GPT-4o-mini.',
    icon: '🤖',
    status: 'configured',
    detail: 'API key set in environment.',
    action: null,
  },
  {
    name: 'Resend',
    description: 'Transactional email delivery with open & bounce tracking.',
    icon: '📨',
    status: 'partial',
    detail: 'API key set. Webhook secret not configured — open/bounce tracking inactive.',
    action: { label: 'How to set up webhook', href: null, info: 'Go to resend.com → Webhooks → Add Webhook → copy signing secret → paste into .env as RESEND_WEBHOOK_SECRET' },
  },
  {
    name: 'Apify',
    description: 'LinkedIn job scraper for sourcing job listings at scale.',
    icon: '🕷️',
    status: 'configured',
    detail: 'API key set in environment.',
    action: null,
  },
  {
    name: 'LinkedIn',
    description: 'li_at session cookie for scraping LinkedIn job posts.',
    icon: '💼',
    status: 'not_connected',
    detail: 'Placeholder value set. Add your li_at cookie from a secondary LinkedIn account.',
    action: null,
  },
  {
    name: 'Adzuna',
    description: 'Job board API for scraping public listings by keyword.',
    icon: '📋',
    status: 'configured',
    detail: 'App ID and API key set in environment.',
    action: null,
  },
];

function IntegrationsTab() {
  const [expandedInfo, setExpandedInfo] = useState(null);

  const statusConfig = {
    configured:    { label: 'Connected',       pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    partial:       { label: 'Partial',         pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
    not_connected: { label: 'Not Connected',   pill: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
  };

  return (
    <div className="space-y-5">
      <SectionCard title="API Integrations" description="Services connected to your backend via environment variables." noPad>
        <div className="divide-y divide-neutral-dark">
          {INTEGRATIONS.map((intg) => {
            const cfg = statusConfig[intg.status];
            const isExpanded = expandedInfo === intg.name;
            return (
              <div key={intg.name} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral border border-neutral-dark flex items-center justify-center text-lg shrink-0">
                      {intg.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-black">{intg.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${cfg.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-dark mt-0.5">{intg.description}</p>
                      <p className="text-xs text-secondary-dark/60 mt-1">{intg.detail}</p>
                    </div>
                  </div>
                  {intg.action && (
                    <button
                      onClick={() => setExpandedInfo(isExpanded ? null : intg.name)}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold text-primary-dark border border-primary-light/30 bg-primary-light/5 hover:bg-primary-light/10 rounded-xl transition-all"
                    >
                      {isExpanded ? 'Hide' : 'How to fix'}
                    </button>
                  )}
                </div>
                {intg.action && isExpanded && (
                  <div className="mt-3 ml-13 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    {intg.action.info}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="bg-neutral/60 rounded-2xl border border-neutral-dark px-6 py-4 flex items-start gap-3">
        <Key className="w-4 h-4 text-secondary-dark/60 mt-0.5 shrink-0" />
        <p className="text-xs text-secondary-dark">
          API keys are stored in your backend <code className="bg-neutral-dark px-1 py-0.5 rounded">Backend/.env</code> file. To change any key, update the file and redeploy your backend on Render.
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB — DANGER ZONE
// ═════════════════════════════════════════════════════════════════════════════

function DangerTab({ navigate }) {
  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('outreach_prefs');
    localStorage.removeItem('warmup_defaults');
    toast.success('Signed out successfully');
    setTimeout(() => navigate('/', { replace: true }), 500);
  };

  return (
    <div className="space-y-5">
      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50/40">
          <h3 className="text-base font-bold text-red-700 font-montserrat">Sign Out</h3>
          <p className="text-sm text-red-600/70 mt-0.5">End your current session on this device.</p>
        </div>
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-black-light font-medium">Sign out of your account</p>
            <p className="text-xs text-secondary-dark mt-0.5">You will need to sign back in to access the dashboard.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-red-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Clear prefs */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-amber-100 bg-amber-50/40">
          <h3 className="text-base font-bold text-amber-700 font-montserrat">Reset Preferences</h3>
          <p className="text-sm text-amber-600/70 mt-0.5">Clear all locally saved settings to defaults.</p>
        </div>
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-black-light font-medium">Reset outreach & warmup defaults</p>
            <p className="text-xs text-secondary-dark mt-0.5">Clears saved preferences from your browser. Does not affect your account or data.</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('outreach_prefs');
              localStorage.removeItem('warmup_defaults');
              toast.success('Preferences reset to defaults');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-amber-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-neutral border border-neutral-dark">
        <Shield className="w-4 h-4 text-secondary-dark/60 mt-0.5 shrink-0" />
        <p className="text-xs text-secondary-dark">
          Permanent data (jobs, contacts, emails, warmup logs) is stored on your backend database. To delete account data, contact your system admin or clear the database directly via the Django admin panel at <code className="bg-neutral-dark px-1 rounded">/admin/</code>.
        </p>
      </div>
    </div>
  );
}

export default Settings;
