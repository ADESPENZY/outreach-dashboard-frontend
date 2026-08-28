import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

import Settings, { DangerZone, ProfileTab, SendingTab, JobsTab, AccountTab } from '@/components/Settings';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, settingsLink, settingsPath } from '@/constants/settingsSections';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getMe } from '@/services/apiAuth';
import { getProfile } from '@/services/apiProfile';
import { getInboxStats } from '@/services/apiInboxes';
import { useAuth } from '@/context/AuthContext';

/*
 * The mobile (<768px) face of Settings — a two-level pattern.
 *
 *   Level 1  /dashboard/settings          → the grouped row list below
 *   Level 2  /dashboard/settings/<slug>   → one section, full screen
 *
 * Desktop is untouched: every route here also renders <Settings />, which is
 * `hidden md:block`, so at md+ the tab rail is what shows and these mobile
 * views are display:none. Nothing is duplicated — the section screens render
 * the SAME tab components the desktop rail does, passed an `only` prop that
 * narrows them to a single section.
 */

// ── Level 1 row ─────────────────────────────────────────────────────────────
// min-h-[56px] clears the 44px touch-target floor (DESIGN_GUIDE §5) with room
// for the two-line label the wider rows carry.
function Row({ slug, badge, onNavigate }) {
  const s = SETTINGS_SECTIONS[slug];
  const Icon = s.icon;
  return (
    <button
      type="button"
      onClick={() => onNavigate(settingsPath(slug))}
      className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral/60 active:bg-neutral transition-colors"
    >
      <span className="w-9 h-9 rounded-xl bg-primary-light/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary-dark" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-black truncate">{s.label}</span>
        <span className="block text-xs text-secondary-dark truncate">{s.desc}</span>
      </span>
      {badge && <span className="text-xs font-semibold text-secondary-dark shrink-0">{badge}</span>}
      <ChevronRight className="w-4 h-4 text-secondary-dark/60 shrink-0" />
    </button>
  );
}

function GroupLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-secondary-dark/60 uppercase tracking-wider px-1 mb-1.5">
      {children}
    </p>
  );
}

// ── Level 1 list ────────────────────────────────────────────────────────────
export function SettingsMobileHome() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: inboxes } = useQuery({ queryKey: ['inboxes'], queryFn: getInboxStats });

  const displayName = profile?.full_name || me?.first_name || me?.username || 'You';
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const role = profile?.skills_extracted?.job_titles_fit?.[0] || me?.email || '';

  // Status badges, all derived from data these three queries already carry —
  // no extra round-trip for the list.
  const inboxCount = inboxes?.accounts?.length ?? 0;
  const badges = {
    cv: profile?.cv_raw_text ? 'Uploaded' : 'Not uploaded',
    inboxes: inboxCount ? `${inboxCount} connected` : 'None',
    'sending-preferences': (profile?.job_preferences?.auto_followups ?? true) ? 'On' : 'Off',
    subscription: 'Free',
  };

  const signOut = async () => {
    await logout();
    toast.success('Signed out.');
    setTimeout(() => navigate('/', { replace: true }), 400);
  };

  return (
    <div className="md:hidden p-4 w-full space-y-6 animate-fade-in font-roboto">
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-black to-secondary-dark font-montserrat">Settings</h1>
        <p className="text-sm text-secondary-dark mt-1">Profile, sending, job search, and login.</p>
      </div>

      {/* Identity card — the whole card is the tap target for Profile. */}
      <button
        type="button"
        onClick={() => navigate(settingsPath('profile'))}
        className="w-full flex items-center gap-4 bg-white rounded-2xl border border-neutral-dark shadow-sm px-4 py-4 text-left hover:bg-neutral/40 active:bg-neutral transition-colors"
      >
        <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light to-primary-dark flex items-center justify-center text-white text-lg font-bold font-montserrat shadow-lg shadow-primary-light/30 shrink-0">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-black font-montserrat truncate">{displayName}</span>
          <span className="block text-sm text-secondary-dark truncate">{role}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-secondary-dark/60 shrink-0" />
      </button>

      {SETTINGS_GROUPS.map(group => (
        <div key={group.label}>
          <GroupLabel>{group.label}</GroupLabel>
          <div className="bg-white rounded-2xl border border-neutral-dark shadow-sm overflow-hidden divide-y divide-neutral-dark">
            {group.slugs.map(slug => (
              <Row key={slug} slug={slug} badge={badges[slug]} onNavigate={navigate} />
            ))}
          </div>
        </div>
      ))}

      {/* Sign out — deliberately standalone, in no group, above Danger Zone. */}
      <button
        type="button"
        onClick={signOut}
        className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-neutral-dark shadow-sm text-left hover:bg-neutral/60 active:bg-neutral transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-neutral flex items-center justify-center shrink-0">
          <LogOut className="w-4 h-4 text-secondary-dark" />
        </span>
        <span className="flex-1 text-sm font-semibold text-black">Sign out</span>
      </button>

      {/* Danger Zone stays inline — no row, no route, nothing to tap into. */}
      <DangerZone navigate={navigate} showSignOut={false} />
    </div>
  );
}

// ── Level 2: one section, full screen ───────────────────────────────────────
const TAB_COMPONENTS = {
  profile: ProfileTab,
  sending: SendingTab,
  jobs: JobsTab,
  account: AccountTab,
};

function SettingsMobileSection({ slug }) {
  const navigate = useNavigate();
  const section = SETTINGS_SECTIONS[slug];
  const Tab = TAB_COMPONENTS[section.tab];

  return (
    <div className="md:hidden p-4 w-full space-y-4 animate-fade-in font-roboto">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate('/dashboard/settings')}
          aria-label="Back to Settings"
          className="w-11 h-11 -ml-2 flex items-center justify-center rounded-xl text-secondary-dark hover:text-black-light hover:bg-neutral transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-black font-montserrat truncate min-w-0">{section.label}</h1>
      </div>

      {/* The same tab body desktop renders, narrowed to this one section. */}
      <div className="space-y-4">
        <Tab only={section.only} navigate={navigate} />
      </div>
    </div>
  );
}

// ── Route elements ──────────────────────────────────────────────────────────
// Each renders BOTH faces; the breakpoint classes decide which one is visible.

export function SettingsHomeRoute() {
  return (
    <>
      <SettingsMobileHome />
      <Settings />
    </>
  );
}

/*
 * Breakpoint-aware redirect for the legacy route aliases in App.jsx
 * (/onboarding, /dashboard/profile). A bare <Navigate to="…?tab=x"> can't make
 * this choice — it's a static string — so the decision lives here.
 */
export function SettingsTabRedirect({ tab }) {
  const isMobile = useIsMobile();
  return <Navigate to={settingsLink(tab, isMobile)} replace />;
}

export function SettingsSectionRoute() {
  const { section: slug } = useParams();
  const section = SETTINGS_SECTIONS[slug];

  // Unknown slug — send them back to Level 1 rather than a blank screen.
  if (!section) return <Navigate to="/dashboard/settings" replace />;

  return (
    <>
      <SettingsMobileSection slug={slug} />
      {/* A desktop browser on a section URL still gets the normal tab rail,
          opened on the tab that owns this section. */}
      <Settings initialTab={section.tab} />
    </>
  );
}
