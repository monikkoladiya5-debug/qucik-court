import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity, LogOut, User, Building2, ShieldCheck,
  Menu, X, ChevronRight, Sparkles, CalendarCheck, Users,
  LayoutDashboard, Search, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUnreadCount } from '../services/api';

const ROLE_META = {
  CUSTOMER: { label: 'Player', icon: User, color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/20' },
  OWNER: { label: 'Venue Partner', icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ADMIN: { label: 'HQ Admin', icon: ShieldCheck, color: 'text-slate-300', bg: 'bg-slate-800', border: 'border-slate-700' },
};

export default function Header() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadNotifCount(0);
      return;
    }
    try {
      const res = await fetchUnreadCount();
      if (res && typeof res.unreadCount === 'number') {
        setUnreadNotifCount(res.unreadCount);
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [loadUnreadCount, location.pathname]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const meta = role ? ROLE_META[role] : null;
  const RoleIcon = meta?.icon;

  const brandDestination = !isAuthenticated
    ? '/'
    : role === 'OWNER'
    ? '/owner/dashboard'
    : role === 'ADMIN'
    ? '/admin/dashboard'
    : '/';

  function handleLogout() {
    logout();
    setMobileMenuOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <header className="bg-[#0B0F17]/90 backdrop-blur-md border-b border-[#28303F] sticky top-0 z-50 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity & Primary Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            to={brandDestination}
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400 rounded-lg py-1 px-1 transition-opacity hover:opacity-95"
            aria-label="QuickCourt Home"
          >
            <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center text-slate-950 shadow-qc-lime">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center tracking-tight leading-none">
              <span className="text-lg font-black text-white">
                Quick<span className="text-lime-400">Court</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {/* Customer / Unauthenticated Navigation */}
            {(!isAuthenticated || role === 'CUSTOMER') && (
              <>
                <NavLink
                  to="/venues"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      isActive
                        ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  Explore Courts
                </NavLink>

                <NavLink
                  to="/players"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <Users className="w-3.5 h-3.5 text-lime-400" />
                  <span>Find Players</span>
                </NavLink>

                {isAuthenticated && (
                  <>
                    <NavLink
                      to="/my-bookings"
                      className={({ isActive }) =>
                        `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30'
                            : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                        }`
                      }
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-lime-400" />
                      <span>My Bookings</span>
                    </NavLink>

                    <NavLink
                      to="/profile"
                      className={({ isActive }) =>
                        `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30'
                            : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                        }`
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                      <span>Profile & Rewards</span>
                    </NavLink>
                  </>
                )}
              </>
            )}

            {/* Owner Navigation */}
            {isAuthenticated && role === 'OWNER' && (
              <>
                <NavLink
                  to="/owner/dashboard"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-lime-400" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink
                  to="/owner/venues"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <Building2 className="w-3.5 h-3.5 text-lime-400" />
                  <span>My Venues</span>
                </NavLink>
              </>
            )}

            {/* Admin Navigation */}
            {isAuthenticated && role === 'ADMIN' && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-white bg-slate-800 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin Dashboard</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right: Actions, Primary CTA & Auth */}
        <div className="flex items-center gap-3">
          {/* Role-Specific Primary CTA */}
          {(!isAuthenticated || role === 'CUSTOMER') && (
            <Link
              to="/venues"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-qc-lime transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find a Court</span>
            </Link>
          )}

          {isAuthenticated && role === 'OWNER' && (
            <Link
              to="/owner/venues"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Manage Venues</span>
            </Link>
          )}

          {/* User Status / Auth Controls */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              {/* Notification Bell */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-full text-slate-300 hover:text-white bg-[#181C24] hover:bg-[#1E2430] border border-[#28303F] hover:border-lime-400/40 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400"
                aria-label={`Notifications (${unreadNotifCount} unread)`}
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-lime-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-qc-lime">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </Link>

              {/* Role Badge */}
              {meta && (
                <span className={`hidden lg:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                  <RoleIcon className="w-3 h-3" />
                  {meta.label}
                </span>
              )}

              {/* User Avatar + Name */}
              {role === 'CUSTOMER' ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-2 border-l border-[#28303F] hover:opacity-90 transition group focus:outline-none focus:ring-2 focus:ring-lime-400 rounded-lg"
                  title="View Customer Profile & Rewards"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover border border-[#28303F]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#181C24] text-lime-400 border border-[#28303F] font-bold text-xs flex items-center justify-center">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[110px] truncate group-hover:text-lime-400 transition-colors">
                    {user.name}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 pl-2 border-l border-[#28303F]">
                  <div className="w-7 h-7 rounded-full bg-[#181C24] text-slate-200 border border-[#28303F] font-bold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                    {user.name}
                  </span>
                </div>
              )}

              {/* Sign out */}
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-[#181C24] hover:bg-rose-500/10 rounded-full border border-[#28303F] hover:border-rose-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-[#181C24] hover:bg-[#1E2430] rounded-full border border-[#28303F] hover:border-lime-400/40 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <User className="w-3.5 h-3.5 text-lime-400" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white bg-[#181C24] border border-[#28303F] focus:outline-none focus:ring-2 focus:ring-lime-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav aria-label="Mobile Navigation" className="md:hidden border-t border-[#28303F] bg-[#0B0F17] px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          {/* Primary CTA inside mobile drawer */}
          {(!isAuthenticated || role === 'CUSTOMER') && (
            <>
              <Link
                to="/venues"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full bg-lime-400 text-slate-950 font-bold text-sm shadow-qc-lime"
              >
                <Search className="w-4 h-4" />
                <span>Find a Court</span>
              </Link>

              <NavLink
                to="/venues"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30' : 'text-slate-300 hover:bg-[#181C24]'
                  }`
                }
              >
                <span>Explore Courts</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>

              <NavLink
                to="/players"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30' : 'text-slate-300 hover:bg-[#181C24]'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-lime-400" />
                  <span>Find Players</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>

              {isAuthenticated && (
                <>
                  <NavLink
                    to="/my-bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30' : 'text-slate-300 hover:bg-[#181C24]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-lime-400" />
                      <span>My Bookings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </NavLink>

                  <NavLink
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30' : 'text-slate-300 hover:bg-[#181C24]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-lime-400" />
                      <span>Profile & Rewards</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </NavLink>
                </>
              )}
            </>
          )}

          {isAuthenticated && role === 'OWNER' && (
            <>
              <Link
                to="/owner/venues"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full bg-emerald-500 text-slate-950 font-bold text-sm shadow-md"
              >
                <Building2 className="w-4 h-4" />
                <span>Manage Venues</span>
              </Link>

              <NavLink
                to="/owner/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-[#181C24]'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Owner Dashboard</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>

              <NavLink
                to="/owner/venues"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-[#181C24]'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>My Venues</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>
            </>
          )}

          {isAuthenticated && role === 'ADMIN' && (
            <NavLink
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-[#181C24]'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Admin Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </NavLink>
          )}



          {isAuthenticated && (
            <NavLink
              to="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30' : 'text-slate-300 hover:bg-[#181C24]'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-lime-400" />
                <span>Notifications</span>
              </div>
              <div className="flex items-center gap-1.5">
                {unreadNotifCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-lime-400 text-slate-950 font-black text-[10px]">
                    {unreadNotifCount}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </NavLink>
          )}

          {isAuthenticated && user ? (
            <div className="pt-3 mt-2 border-t border-[#28303F] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#181C24] text-lime-400 border border-[#28303F] font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{user.name}</div>
                  <div className="text-[11px] font-medium text-lime-400">{role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full hover:bg-rose-500/20 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 px-4 rounded-full bg-[#181C24] hover:bg-[#1E2430] border border-[#28303F] text-white font-bold text-sm transition-colors"
              >
                Sign In / Register
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
