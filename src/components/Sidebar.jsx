import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
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
  Target,
  PanelLeft,
  PanelLeftClose,
  ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getGmailAccounts } from '@/services/apiGmail';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      {
        name: 'Jobs & Outreach',
        icon: Briefcase,
        id: 'jobs-outreach',
        children: [
          { name: 'Jobs',        icon: Briefcase,  path: '/dashboard/jobs' },
          { name: 'Job Tracker', icon: ListChecks, path: '/dashboard/job-tracker' },
          { name: 'Outreach',    icon: Send,       path: '/dashboard/outreach' },
        ],
      },
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
      {
        name: 'Account',
        icon: UserCircle,
        id: 'account',
        children: [
          { name: 'Profile',    icon: UserCircle, path: '/dashboard/profile' },
          { name: 'Settings',   icon: Settings,   path: '/dashboard/settings' },
          { name: 'Auto-Scout', icon: Target,     path: '/dashboard/auto-scout' },
        ],
      },
    ],
  },
];

const Sidebar = ({ isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();
  const navRef = useRef(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gmailAccounts'],
    queryFn: getGmailAccounts,
  });

  const accounts = data?.results ?? [];

  const toggleDropdown = (id) => {
    setOpenDropdown(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  useEffect(() => { setOpenDropdown(null); }, [location.pathname]);
  useEffect(() => { setOpenDropdown(null); }, [isCollapsed]);

  const isChildActive = (children) =>
    children.some(child =>
      location.pathname === child.path || location.pathname.startsWith(child.path + '/')
    );

  const renderNavItem = (item) => {
    if (item.children) {
      const childActive = isChildActive(item.children);
      const dropdownOpen = openDropdown === item.id;

      return (
        <li key={item.name} className="relative">
          <button
            onClick={() => toggleDropdown(item.id)}
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
              'transition-all duration-200 border border-transparent',
              isCollapsed ? 'md:justify-center md:px-2' : '',
              childActive || dropdownOpen
                ? 'bg-primary-light/10 text-primary-dark font-semibold border-primary-light/20 shadow-sm'
                : 'text-secondary-dark hover:bg-neutral hover:text-black-light',
            ].join(' ')}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0 stroke-[1.75px]" />
            <span className={`text-sm flex-1 text-left ${isCollapsed ? 'md:hidden' : ''}`}>
              {item.name}
            </span>
            <ChevronDown className={[
              'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
              dropdownOpen ? 'rotate-180' : '',
              isCollapsed ? 'md:hidden' : '',
            ].join(' ')} />
          </button>

          {/* Mobile: inline accordion — never shown on desktop */}
          <div className={[
            'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
            dropdownOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}>
            <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-neutral-dark pl-3">
              {item.children.map(child => (
                <NavLink
                  key={child.name}
                  to={child.path}
                  end={child.path === '/dashboard'}
                  onClick={() => { onClose(); setOpenDropdown(null); }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border border-transparent ${
                      isActive
                        ? 'bg-primary-light/10 text-primary-dark font-semibold border-primary-light/20 shadow-sm'
                        : 'text-secondary-dark hover:bg-neutral hover:text-black-light'
                    }`
                  }
                >
                  <child.icon className="w-3.5 h-3.5 shrink-0 stroke-[1.75px]" />
                  <span className="text-sm">{child.name}</span>
                </NavLink>
              ))}
            </ul>
          </div>

          {/* Desktop: floating absolute card — never shown on mobile */}
          {dropdownOpen && (
            <div className="hidden md:block absolute left-full ml-2 top-0 bg-white shadow-lg border border-neutral-dark rounded-xl p-2 min-w-[160px] z-[70]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-secondary-dark/50 px-2.5 pt-1.5 pb-1 font-montserrat">
                {item.name}
              </p>
              {item.children.map(child => (
                <NavLink
                  key={child.name}
                  to={child.path}
                  end={child.path === '/dashboard'}
                  onClick={() => setOpenDropdown(null)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-light/10 text-primary-dark font-semibold'
                        : 'text-secondary-dark hover:bg-neutral hover:text-black-light'
                    }`
                  }
                >
                  <child.icon className="w-3.5 h-3.5 shrink-0 stroke-[1.75px]" />
                  <span className="text-sm">{child.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </li>
      );
    }

    return (
      <NavLink
        key={item.name}
        to={item.path}
        end={item.path === '/dashboard'}
        onClick={onClose}
        className={({ isActive }) =>
          [
            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
            'transition-all duration-200 border border-transparent',
            isCollapsed ? 'md:justify-center md:px-2' : '',
            isActive
              ? 'bg-primary-light/10 text-primary-dark font-semibold border-primary-light/20 shadow-sm'
              : 'text-secondary-dark hover:bg-neutral hover:text-black-light',
          ].join(' ')
        }
        title={isCollapsed ? item.name : undefined}
      >
        <item.icon className="w-4 h-4 shrink-0 stroke-[1.75px]" />
        <span className={`text-sm ${isCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <aside
      className={[
        'bg-white border-r border-neutral-dark h-screen flex flex-col py-5',
        'shadow-[4px_0_24px_rgba(0,0,0,0.02)] font-roboto',
        // Mobile: fixed drawer, slide in/out — PRESERVED unchanged
        'fixed inset-y-0 left-0 z-[60] w-[85vw] max-w-xs px-4',
        'overflow-y-auto',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: static sidebar; overflow-visible lets the floating dropdown escape
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

        {/* Brand logo + text — hidden on desktop when collapsed */}
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:hidden' : ''}`}>
          <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2 rounded-xl shadow-lg shadow-primary-light/30 shrink-0">
            <Rocket className="text-white w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight font-montserrat text-black">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Apply</span>DIR
          </h2>
        </div>

        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="hidden md:flex p-1.5 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors"
          title="Toggle Sidebar"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed
            ? <PanelLeft className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>

        {/* Mobile drawer close — hidden on desktop */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Nav — flex-1 fills all space between header and bottom ── */}
      <nav ref={navRef} className="flex-1 flex flex-col gap-2 mt-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {isCollapsed ? (
              <div className="hidden md:block h-px bg-neutral-dark mx-1 mt-6 mb-2" />
            ) : (
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-dark/60 px-3 mt-6 mb-2 font-montserrat">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom section — mt-auto pins it to the foot of the sidebar ── */}
      <div className="mt-auto">

        {/* Connected Inboxes — full view when expanded */}
        <div className={`pt-4 border-t border-neutral-dark mt-3 ${isCollapsed ? 'md:hidden' : ''}`}>
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="text-[10px] font-bold text-secondary-dark/60 uppercase tracking-widest font-montserrat">
              Connected Inboxes
            </h3>
            <div className="w-2 h-2 rounded-full bg-primary-light animate-pulse shadow-[0_0_8px_rgba(255,91,46,0.6)]" />
          </div>

          <ul className="space-y-2 mb-2">
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
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-dashed border-neutral-dark text-xs font-semibold rounded-xl text-secondary-dark hover:bg-primary-light/5 hover:text-primary-dark hover:border-primary-light/40 transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Add Gmail
          </Link>
        </div>

        {/* Connected Inboxes — icon-only when collapsed on desktop */}
        <div className={`pt-4 border-t border-neutral-dark mt-3 flex-col items-center gap-3 ${isCollapsed ? 'hidden md:flex' : 'hidden'}`}>
          <div className="w-2 h-2 rounded-full bg-primary-light animate-pulse shadow-[0_0_8px_rgba(255,91,46,0.6)]" />
          <Link
            to="/dashboard/connectedAccounts"
            onClick={onClose}
            title="Add Gmail"
            className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-dashed border-neutral-dark text-secondary-dark hover:bg-primary-light/5 hover:text-primary-dark hover:border-primary-light/40 transition-all duration-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
