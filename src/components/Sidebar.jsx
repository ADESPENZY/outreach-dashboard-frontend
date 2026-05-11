import { Link, NavLink } from 'react-router-dom';
import {
  Rocket,
  LayoutDashboard,
  Mail,
  Briefcase,
  BarChart,
  Flame,
  Settings,
  User,
  UserCircle,
  Plus,
  MoreHorizontal,
  Send,
  ListChecks,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getGmailAccounts } from '@/services/apiGmail';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Jobs',        icon: Briefcase,        path: '/dashboard/jobs' },
      { name: 'Job Tracker', icon: ListChecks,       path: '/dashboard/job-tracker' },
      { name: 'Outreach',   icon: Send,             path: '/dashboard/outreach' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Inboxes',        icon: Mail,    path: '/dashboard/inboxes' },
      { name: 'Analytics',      icon: BarChart, path: '/dashboard/analytics' },
      { name: 'Warmup Manager', icon: Flame,   path: '/dashboard/warmup' },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Profile',  icon: UserCircle, path: '/dashboard/profile' },
      { name: 'Settings', icon: Settings,   path: '/dashboard/settings' },
    ],
  },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gmailAccounts'],
    queryFn: getGmailAccounts,
  });

  const accounts = data?.results ?? [];

  return (
    <aside
      className={[
        // Base (shared desktop + mobile)
        'bg-white border-r border-neutral-dark h-screen flex flex-col justify-between px-4 py-7',
        'shadow-[4px_0_24px_rgba(0,0,0,0.02)] font-roboto overflow-y-auto',
        // Mobile: fixed drawer, slide in/out
        'fixed inset-y-0 left-0 z-[60] w-[85vw] max-w-xs',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: static, always visible, original width
        'md:relative md:z-40 md:w-[22%] md:translate-x-0',
      ].join(' ')}
    >

      {/* ── Brand + mobile close ──────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex justify-between items-center w-full px-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2 rounded-xl shadow-lg shadow-primary-light/30">
              <Rocket className="text-white w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight font-montserrat text-black">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Auto</span>Apply
            </h2>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Nav groups ──────────────────────────────────────────── */}
        <nav className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-dark/60 px-3 mb-1.5 font-montserrat">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out border border-transparent ${
                        isActive
                          ? 'bg-primary-light/10 text-primary-dark font-semibold border-primary-light/20 shadow-sm'
                          : 'text-secondary-dark hover:bg-neutral hover:text-black-light'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0 stroke-[1.75px]" />
                    <span className="text-sm">{item.name}</span>
                  </NavLink>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* ── Connected Inboxes ──────────────────────────────────────── */}
      <div className="pt-5 border-t border-neutral-dark mt-4">
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="text-[10px] font-bold text-secondary-dark/60 uppercase tracking-widest font-montserrat">
            Connected Inboxes
          </h3>
          <div className="w-2 h-2 rounded-full bg-primary-light animate-pulse shadow-[0_0_8px_rgba(255,91,46,0.6)]" />
        </div>

        <ul className="space-y-2 mb-3">
          {isLoading ? (
            <li className="text-center text-xs text-secondary-dark/60 animate-pulse py-2">Fetching accounts...</li>
          ) : isError ? (
            <li className="text-center text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error.message}</li>
          ) : accounts.length > 0 ? (
            accounts.slice(0, 3).map((account) => (
              <li
                key={account.id}
                className="group flex items-center justify-between bg-white border border-neutral-dark rounded-xl p-2 shadow-sm hover:shadow-md hover:border-primary-light/30 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center overflow-hidden">
                  <div className="w-7 h-7 min-w-7 rounded-full bg-gradient-to-tr from-neutral to-neutral-dark border border-neutral-dark flex items-center justify-center text-secondary-dark/60 mr-2.5 group-hover:text-primary-light group-hover:border-primary-light/20 transition-colors">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-black-light truncate">{account.email}</p>
                    <div className="flex items-center mt-0.5 gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        account.is_active
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                          : 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                      }`} />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-dark/60">
                        {account.is_active ? 'Live' : 'Warming'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="text-secondary-dark/40 hover:text-secondary-dark transition-colors shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </li>
            ))
          ) : (
            <li className="text-center text-xs text-secondary-dark bg-neutral rounded-xl p-3 border border-dashed border-neutral-dark">
              No accounts linked
            </li>
          )}
        </ul>

        <Link
          to="/dashboard/connectedAccounts"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-2 border-dashed border-neutral-dark text-xs font-semibold rounded-xl text-secondary-dark hover:bg-primary-light/5 hover:text-primary-dark hover:border-primary-light/40 transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          Add Gmail
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
