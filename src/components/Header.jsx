import { Bell, ChevronDown, HelpCircle, LogOut, Menu, MessageSquare, Send, User, UserCog } from 'lucide-react';
import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/services/apiAuth';
import { getAnalytics } from '@/services/apiAnalytics';
import { useAuth } from '@/context/AuthContext';

// Time-of-day greeting — uses the visitor's local clock.
function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const Header = ({ onMenuClick }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const navigate = useNavigate();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  // Live "this week" stat for the greeting line — last 7 days, reuses the
  // analytics endpoint (cached, shared with the dashboard overview).
  const { data: analytics } = useQuery({
    queryKey: ['analytics', 7],
    queryFn: () => getAnalytics(7),
    staleTime: 5 * 60 * 1000,
  });

  const fullName = me?.first_name
    ? `${me.first_name} ${me.last_name}`.trim()
    : me?.username;

  const firstName = me?.first_name || me?.username || 'there';
  const sent    = analytics?.summary?.total_sent ?? 0;
  const replied = analytics?.summary?.total_replied ?? 0;

  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-neutral-dark py-3 md:py-4 px-4 md:px-8 flex items-center justify-between gap-3 font-roboto shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] transition-all">
        {/* Left: hamburger (mobile only) + greeting */}
        <div className="flex items-center gap-3 min-w-0">
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-1 rounded-lg text-secondary-dark hover:bg-neutral hover:text-black-light transition-colors shrink-0"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-black-light tracking-tight font-montserrat truncate">
                    {greetingFor()}, {isLoading ? '…' : firstName} <span className="hidden sm:inline">👋</span>
                </h1>
                <p className="hidden sm:flex items-center gap-3 text-xs text-secondary-dark mt-0.5">
                    <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                        <b className="text-black-light">{replied}</b> {replied === 1 ? 'reply' : 'replies'}
                    </span>
                    <span className="text-secondary-dark/40">·</span>
                    <span className="inline-flex items-center gap-1">
                        <Send className="w-3.5 h-3.5 text-primary-light" />
                        <b className="text-black-light">{sent}</b> sent this week
                    </span>
                </p>
            </div>
        </div>

        {/* Right: notifications + account */}
        <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="relative group cursor-pointer">
                <div className="p-2 rounded-full hover:bg-neutral-dark transition-colors duration-200">
                    <Bell className="w-5 h-5 text-secondary-dark group-hover:text-primary-light transition-colors" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary-light border-2 border-white"></span>
                </div>
            </div>

            <div className="relative">
            <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-3 p-1.5 rounded-full border border-transparent hover:border-neutral-dark hover:bg-neutral transition-all duration-300"
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-dark to-primary-light flex items-center justify-center text-white shadow-md">
                   <User className="w-5 h-5 drop-shadow-sm" />
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-black-light tracking-wide">
                    {isLoading ? "Loading..." : fullName || "Admin"}
                </span>
                <ChevronDown className="hidden sm:block w-4 h-4 text-secondary-dark/60" />
            </button>

            {showProfileDropdown && (
                <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl border border-neutral-dark shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden z-20 transition-all origin-top-right animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-neutral-dark bg-neutral/50">
                    <p className="text-sm font-medium text-black">{fullName || "Admin"}</p>
                    <p className="text-xs text-secondary-dark truncate">{me?.email || "No email linked"}</p>
                </div>
                <NavLink
                    to="/dashboard/profile-settings"
                    className="flex items-center px-4 py-3 text-sm text-secondary-dark hover:text-primary-dark hover:bg-primary-light/5 transition-colors"
                >
                    <UserCog className="w-4 h-4 mr-3" />
                    Profile Settings
                </NavLink>
                <NavLink
                    to="/dashboard/help"
                    className="flex items-center px-4 py-3 text-sm text-secondary-dark hover:text-primary-dark hover:bg-primary-light/5 transition-colors"
                >
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help & Support
                </NavLink>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-500 border-t border-neutral-dark hover:bg-red-50 transition-colors"
                >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                </button>
                </div>
            )}
            </div>
        </div>
    </header>
  );
};

export default Header;
