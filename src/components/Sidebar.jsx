import { Link, NavLink, useNavigate } from 'react-router-dom';
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
  MoreHorizontal
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getGmailAccounts } from '@/services/apiBlog';

const Sidebar = () => {
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Inboxes', icon: Mail, path: '/dashboard/inboxes' },
    { name: 'Job Tracker', icon: Briefcase, path: '/dashboard/job-tracker' },
    { name: 'Analytics', icon: BarChart, path: '/dashboard/analytics' },
    { name: 'Jobs', icon: Briefcase, path: '/dashboard/jobs' },
    { name: 'Warmup Manager', icon: Flame, path: '/dashboard/warmup' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
    { name: 'Connected Accounts', icon: User, path: '/dashboard/connectedAccounts' },
    { name: 'Profile', icon: UserCircle, path: '/dashboard/profile' },
  ];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gmailAccounts'],
    queryFn: getGmailAccounts,
  });

  const accounts = data?.results ?? [];

  return (
    <aside className="bg-white border-r border-gray-100 h-screen flex flex-col justify-between px-6 py-8 md:w-[22%] shadow-[4px_0_24px_rgba(0,0,0,0.02)] font-roboto z-40">
      {/* Top Navigation */}
      <div className="space-y-8">
        <div className="flex items-center space-x-3 px-4 group cursor-pointer">
          <div className="bg-gradient-to-br from-primary-light to-primary-dark p-2 rounded-xl shadow-lg shadow-primary-light/30 group-hover:scale-105 transition-transform duration-300">
             <Rocket className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight font-montserrat text-gray-900">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Auto</span>Apply
          </h2>
        </div>

        <ul className="space-y-1.5 text-gray-600 font-medium mt-6">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-300 ease-out border border-transparent ${
                  isActive 
                  ? 'bg-primary-light/10 text-primary-dark font-semibold border-primary-light/20 shadow-sm' 
                  : 'hover:bg-gray-50 hover:text-primary-light hover:translate-x-1'
                }`
              }
              end={item.path === '/dashboard'}
            >
              <item.icon className={`w-5 h-5 transition-colors ${item.name === 'Dashboard' ? '' : 'stroke-[1.5px]'}`} />
              <span className="text-sm">{item.name}</span>
            </NavLink>
          ))}
        </ul>
      </div>

      {/* Connected Accounts Section */}
      <div className="pt-6 pb-2 border-t border-gray-100/80 mx-4">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2 font-montserrat flex items-center justify-between">
          Connected Inboxes
          <div className="w-2 h-2 rounded-full bg-primary-light animate-pulse shadow-[0_0_8px_rgba(255,91,46,0.6)]"></div>
        </h3>

        <ul className="space-y-3 mb-4">
          {isLoading ? (
            <li className="text-center text-xs text-gray-400 animate-pulse">Fetching accounts...</li>
          ) : isError ? (
            <li className="text-center text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error.message}</li>
          ) : accounts && accounts.length > 0 ? (
            accounts.slice(0, 3).map((account) => (
              <li key={account.id} className="group flex items-center justify-between bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm hover:shadow-md hover:border-primary-light/30 transition-all duration-300 cursor-pointer">
                <div className="flex items-center overflow-hidden">
                  <div className="w-8 h-8 min-w-8 rounded-full bg-gradient-to-tr from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 mr-3 group-hover:text-primary-light group-hover:border-primary-light/20 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-gray-800 truncate">{account.email}</p>
                    <div className="flex items-center mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        account.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      } mr-1.5`}></span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                        {account.is_active ? 'Live' : 'Warming'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="text-gray-300 hover:text-gray-600 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </li>
            ))
          ) : (
            <li className="text-center text-xs text-gray-400 bg-gray-50 rounded-xl p-3 border border-gray-100 border-dashed">No accounts linked</li>
          )}
        </ul>

        {/* Connect Button */}
        <Link
          to="/dashboard/connectedAccounts"
          className="w-full flex items-center justify-center px-4 py-2.5 border-2 border-dashed border-gray-200 text-sm font-semibold rounded-xl text-gray-500 bg-white hover:bg-primary-light/5 hover:text-primary-dark hover:border-primary-light/40 transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[2.5]" />
          Add Gmail
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
