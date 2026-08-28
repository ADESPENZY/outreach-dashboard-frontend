import {
  User, FileText, Sparkles, Mail, Send, Briefcase,
  SlidersHorizontal, Crown, KeyRound, Bell, ShieldCheck, Info, HelpCircle,
} from 'lucide-react';

/*
 * The mobile (<768px) Settings map.
 *
 * Desktop keeps the tab rail in Settings.jsx untouched; on mobile the same
 * content is addressed one screen at a time via /dashboard/settings/<slug>.
 * This registry is the single source of truth for that mapping so the Level 1
 * row list and the detail route can never drift apart.
 *
 * Each entry says which existing tab component owns the content (`tab`) and
 * which section inside it to render (`only`) — the tabs render every section
 * when `only` is undefined, which is exactly what desktop does.
 */
export const SETTINGS_SECTIONS = {
  // ── Profile ──────────────────────────────────────────────────────────────
  profile: {
    tab: 'profile', only: 'identity', icon: User,
    label: 'Your Identity',
    desc: 'Name, location, and sign-off links',
  },
  cv: {
    tab: 'profile', only: 'cv', icon: FileText,
    label: 'Your CV',
    desc: 'Powers scoring, tailored CVs, and your voice',
  },
  voice: {
    tab: 'profile', only: 'voice', icon: Sparkles,
    label: 'Your Outreach Voice',
    desc: 'Summary, projects, and tone',
  },

  // ── Email & Sending ──────────────────────────────────────────────────────
  inboxes: {
    tab: 'sending', only: 'inboxes', icon: Mail,
    label: 'Connected Inboxes',
    desc: 'The inboxes your introductions send from',
  },
  'sending-preferences': {
    tab: 'sending', only: 'preferences', icon: Send,
    label: 'Sending Preferences',
    desc: 'Follow-up cadence and automatic sending',
  },
  signature: {
    tab: 'sending', only: 'signature', icon: FileText,
    label: 'Email Signature',
    desc: 'What recipients see at the bottom',
  },

  // ── Job search ───────────────────────────────────────────────────────────
  industry: {
    tab: 'jobs', only: 'industry', icon: Briefcase,
    label: 'Industry & Work Arrangement',
    desc: 'The kind of work you’re looking for',
  },
  roles: {
    tab: 'jobs', only: 'roles', icon: SlidersHorizontal,
    label: 'Target Roles & Locations',
    desc: 'What your headhunter searches for',
  },

  // ── Account ──────────────────────────────────────────────────────────────
  subscription: {
    tab: 'account', only: 'subscription', icon: Crown,
    label: 'Subscription',
    desc: 'Your current plan',
  },
  login: {
    tab: 'account', only: 'login', icon: KeyRound,
    label: 'Login & Password',
    desc: 'Your sign-in details',
  },
  // MERGED screen: the email "Notifications" panel and the "Push notifications"
  // panel are two separate Collapsibles on desktop, one screen on mobile.
  notifications: {
    tab: 'account', only: 'notifications', icon: Bell,
    label: 'Notifications',
    desc: 'Emails, push, and your timezone',
  },
  privacy: {
    tab: 'account', only: 'privacy', icon: ShieldCheck,
    label: 'Data & Privacy',
    desc: 'Export your data or view our policies',
  },
  about: {
    tab: 'account', only: 'about', icon: Info,
    label: 'About ApplyDir',
    desc: 'App version and support',
  },
  help: {
    tab: 'account', only: 'help', icon: HelpCircle,
    label: 'Help & FAQ',
    desc: 'How ApplyDir works, answered',
  },
};

/*
 * Level 1 grouping. Danger Zone is deliberately NOT here — it stays inline at
 * the bottom of the Level 1 list rather than behind a row, so it can't be
 * reached by a stray tap.
 */
export const SETTINGS_GROUPS = [
  { label: 'Profile',         slugs: ['profile', 'cv', 'voice'] },
  { label: 'Email & Sending', slugs: ['inboxes', 'sending-preferences', 'signature'] },
  { label: 'Job Search',      slugs: ['industry', 'roles'] },
  { label: 'Account',         slugs: ['subscription', 'login', 'notifications', 'privacy', 'about', 'help'] },
];

export const settingsPath = (slug) => `/dashboard/settings/${slug}`;

/*
 * Where a `?tab=` deep link should land on MOBILE.
 *
 * A desktop tab holds several sections; a mobile screen holds one. Each tab
 * therefore needs a nominated landing section — the one the existing deep links
 * are actually aiming at:
 *
 *   sending → inboxes  (the Sidebar "Connected Emails" link and SetupChecklist's
 *                       "Connect your inbox" step both mean inbox management)
 *   jobs    → roles    ("Adjust what you're looking for" from the empty states)
 *   profile → profile  (the avatar menu's Profile entry, and the onboarding gate)
 *   account → login    (no deep link uses this today; here so the map is total)
 */
export const SETTINGS_TAB_LANDING = {
  profile: 'profile',
  sending: 'inboxes',
  jobs: 'roles',
  account: 'login',
};

/*
 * The one resolver every Settings deep link should use.
 *
 * settingsLink('sending', isMobile)
 *   mobile  → '/dashboard/settings/inboxes'   (straight to the section screen)
 *   desktop → '/dashboard/settings?tab=sending'  (unchanged, pre-Phase-1 behaviour)
 *
 * Routing through here is what keeps the deep links from drifting away from the
 * routes in this same file.
 */
export function settingsLink(tab, isMobile) {
  if (!isMobile) return `/dashboard/settings?tab=${tab}`;
  const slug = SETTINGS_TAB_LANDING[tab];
  return slug ? settingsPath(slug) : '/dashboard/settings';
}
