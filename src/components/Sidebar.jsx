import { Link, NavLink } from 'react-router-dom';
import {
  Rocket,
  Home,
  Briefcase,
  Mail,
  BarChart3,
  Settings,
  Flame,
  Plus,
  User,
  X,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInboxStats } from '@/services/apiInboxes';

// The 4-item product navigation. Settings is the gear pinned at the very
// bottom; the live Connected Inboxes status sits just above it.
// See ARCHITECTURE.md §1.
const NAV = [
  { name: 'Home',          icon: Home,       path: '/dashboard' },
  { name: 'Opportunities', icon: Briefcase,  path: '/dashboard/opportunities' },
  { name: 'Introductions', icon: Mail,       path: '/dashboard/introductions' },
  { name: 'Progress',      icon: BarChart3,  path: '/dashboard/progress' },
];

// Settings → Connected Emails is where inbox/warmup management lives. That
// sub-section is built in a later phase; for now everything points at Settings.
const CONNECTED_EMAILS_PATH = '/dashboard/settings';

// Map the inbox-stats status enum to the sidebar's display.
function inboxStatus(acc) {
  if (acc.status === 'Warming') {
    const day = acc.warmup?.days_running;
    return {
      label: day ? `Warming Day ${day}` : 'Warming',
      cls: 'text-amber-600',
      icon: 'flame',
    };
  }
  if (acc.status === 'Paused') {
    return { label: 'Issue', cls: 'text-red-600', dot: 'bg-red-500' };
  }
  return { label: 'LIVE', cls: 'text-emerald-600', dot: 'bg-emerald-500' };
}

const Sidebar = ({ isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: inboxData, isLoading: inboxLoading } = useQuery({
    queryKey: ['inboxStats'],
    queryFn: getInboxStats,
    staleTime: 60 * 1000,
  });

  // Priority: warming-up inboxes first (need attention), then most sends today.
  const allInboxes = inboxData?.accounts ?? [];
  const sortedInboxes = [...allInboxes].sort((a, b) => {
    const aWarming = a.status === 'Warming' ? 0 : 1;
    const bWarming = b.status === 'Warming' ? 0 : 1;
    if (aWarming !== bWarming) return aWarming - bWarming;
    return (b.sent_today ?? 0) - (a.sent_today ?? 0);
  });
  const shownInboxes = sortedInboxes.slice(0, 2);
  const totalInboxes = sortedInboxes.length;

  const itemClasses = (isActive) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-xl',
      'transition-all duration-200 border border-transparent',
      isCollapsed ? 'md:justify-center md:px-2' : '',
      isActive
        ? 'bg-primary-light/10 text-primary-dark font-semibold border-primary-light/20 shadow-sm'
        : 'text-secondary-dark hover:bg-neutral hover:text-black-light',
    ].join(' ');

  return (
    <aside
      className={[
        'bg-white border-r border-neutral-dark h-screen flex flex-col py-5',
        'shadow-[4px_0_24px_rgba(0,0,0,0.02)] font-roboto',
        // Mobile: fixed drawer, slide in/out
        'fixed inset-y-0 left-0 z-[60] w-[85vw] max-w-xs px-4',
        'overflow-y-auto',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: static sidebar
        'md:relative md:z-40 md:translate-x-0 md:overflow-visible',
        'md:transition-[width] md:duration-300 md:ease-in-out',
        isCollapsed ? 'md:w-20 md:px-2' : 'md:w-64 md:px-4',
      ].join(' ')}
    >

      {/* ── Header: Brand + Collapse Toggle ─────────────────────── */}
      <div className={[
        'flex items-center w-full px-1 justify-between',
        isCollapsed ? 'md:justify-center' : '',
      ].join(' ')}>
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:hidden' : ''}`}>
          <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2 rounded-xl shadow-lg shadow-primary-light/30 shrink-0">
            <Rocket className="text-white w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight font-montserrat text-black">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Apply</span>DIR
          </h2>
        </div>

        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="hidden md:flex p-1.5 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors"
          title="Toggle Sidebar"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── MAIN nav — the 4 product items ──────────────────────── */}
      <nav className="flex-1 mt-6">
        {isCollapsed ? (
          <div className="hidden md:block h-px bg-neutral-dark mx-1 mb-2" />
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-dark/60 px-3 mb-2 font-montserrat">
            Main
          </p>
        )}
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={onClose}
                className={({ isActive }) => itemClasses(isActive)}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0 stroke-[1.75px]" />
                <span className={`text-sm ${isCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Bottom: Connected Inboxes + Settings gear ───────────── */}
      <div className="mt-auto">

        {/* CONNECTED INBOXES — full status display when expanded */}
        <div className={`pt-4 border-t border-neutral-dark ${isCollapsed ? 'md:hidden' : ''}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-dark/60 px-1 mb-2 font-montserrat">
            Connected Inboxes
          </p>

          <ul className="space-y-1 mb-1.5">
            {inboxLoading ? (
              <li className="text-xs text-secondary-dark/60 animate-pulse px-1 py-1.5">Loading…</li>
            ) : shownInboxes.length === 0 ? (
              <li className="text-xs text-secondary-dark px-1 py-1.5">No inboxes connected</li>
            ) : (
              shownInboxes.map((acc) => {
                const s = inboxStatus(acc);
                return (
                  <li key={acc.id}>
                    <Link
                      to={CONNECTED_EMAILS_PATH}
                      onClick={onClose}
                      title={`${acc.email} — ${s.label}`}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-neutral border border-neutral-dark flex items-center justify-center shrink-0 text-secondary-dark/60 group-hover:text-primary-light">
                        <User className="w-3 h-3" />
                      </span>
                      <span className="text-xs font-medium text-black-light truncate flex-1 min-w-0">{acc.email}</span>
                      {s.icon === 'flame' ? (
                        <Flame className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${s.cls}`}>{s.label}</span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          {totalInboxes > 2 && (
            <Link
              to={CONNECTED_EMAILS_PATH}
              onClick={onClose}
              className="block px-2 mb-1.5 text-[11px] font-semibold text-primary-dark hover:text-primary-light transition-colors"
            >
              View all ({totalInboxes})
            </Link>
          )}

          <Link
            to={CONNECTED_EMAILS_PATH}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-dashed border-neutral-dark text-xs font-semibold rounded-xl text-secondary-dark hover:bg-primary-light/5 hover:text-primary-dark hover:border-primary-light/40 transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Add Gmail
          </Link>
        </div>

        {/* CONNECTED INBOXES — icon-only Add when collapsed on desktop */}
        <div className={`pt-4 border-t border-neutral-dark flex-col items-center ${isCollapsed ? 'hidden md:flex' : 'hidden'}`}>
          <Link
            to={CONNECTED_EMAILS_PATH}
            onClick={onClose}
            title="Add Gmail"
            className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-dashed border-neutral-dark text-secondary-dark hover:bg-primary-light/5 hover:text-primary-dark hover:border-primary-light/40 transition-all duration-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

        {/* Settings gear — the very bottom */}
        <div className="pt-3 mt-3 border-t border-neutral-dark">
          <NavLink
            to="/dashboard/settings"
            onClick={onClose}
            className={({ isActive }) => itemClasses(isActive)}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="w-4 h-4 shrink-0 stroke-[1.75px]" />
            <span className={`text-sm ${isCollapsed ? 'md:hidden' : ''}`}>Settings</span>
          </NavLink>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
