import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity, LogOut, User, Building2, ShieldCheck,
  Menu, X, ChevronRight, Sparkles, CalendarCheck, Users,
  LayoutDashboard, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_META = {
  CUSTOMER:  { label: 'Player',      icon: User,        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  OWNER:     { label: 'Venue Owner', icon: Building2,   color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
  ADMIN:     { label: 'Platform Admin', icon: ShieldCheck, color: 'text-slate-300', bg: 'bg-slate-800',     border: 'border-slate-700' },
};

export default function Header() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  function handleLogout() {
    logout();
    setMobileMenuOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <header className="bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity & Primary Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg py-1 px-1 transition-opacity hover:opacity-95"
            aria-label="QuickCourt Home"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm shadow-emerald-500/30">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center tracking-tight leading-none">
              <span className="text-lg font-black text-white">
                Quick<span className="text-emerald-400">Court</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Customer Navigation">
            <NavLink
              to="/venues"
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                }`
              }
            >
              Venues
            </NavLink>

            {/* If Customer: Players, My Bookings, Profile */}
            {isAuthenticated && role === 'CUSTOMER' && (
              <>
                <NavLink
                  to="/players"
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`
                  }
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Find Players</span>
                </NavLink>

                <NavLink
                  to="/my-bookings"
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`
                  }
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>My Bookings</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`
                  }
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Profile & Points</span>
                </NavLink>
              </>
            )}

            {/* Unauthenticated: Discover Players link */}
            {!isAuthenticated && (
              <NavLink
                to="/players"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                  }`
                }
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Find Players</span>
              </NavLink>
            )}

            {/* Owner Navigation */}
            {isAuthenticated && role === 'OWNER' && (
              <>
                <NavLink
                  to="/owner/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`
                  }
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink
                  to="/owner/venues"
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`
                  }
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>My Venues</span>
                </NavLink>
              </>
            )}

            {/* Admin Navigation */}
            {isAuthenticated && role === 'ADMIN' && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'text-white bg-slate-800 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
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
          {/* Primary CTA: "Find a Court" */}
          <Link
            to="/venues"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs shadow-sm shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find a Court</span>
          </Link>

          {/* User Status / Auth Controls */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              {/* Role Badge */}
              {meta && (
                <span className={`hidden lg:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                  <RoleIcon className="w-3 h-3" />
                  {meta.label}
                </span>
              )}

              {/* User Avatar + Name */}
              {role === 'CUSTOMER' ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-2 border-l border-slate-800 hover:opacity-90 transition group focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg"
                  title="View Customer Profile & Loyalty Points"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-bold text-xs flex items-center justify-center">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[110px] truncate group-hover:text-emerald-400 transition-colors">
                    {user.name}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center">
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
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-500/10 rounded-lg border border-slate-800 hover:border-rose-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav aria-label="Mobile Navigation" className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          {/* Primary CTA inside mobile drawer */}
          <Link
            to="/venues"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Find a Court</span>
          </Link>

          <NavLink
            to="/venues"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900'
              }`
            }
          >
            <span>Explore Venues</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </NavLink>

          <NavLink
            to="/players"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Find Players</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </NavLink>

          {isAuthenticated && role === 'CUSTOMER' && (
            <>
              <NavLink
                to="/my-bookings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  <span>My Bookings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>

              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Profile & Points</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>
            </>
          )}

          {isAuthenticated && role === 'OWNER' && (
            <>
              <NavLink
                to="/owner/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-300 hover:bg-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Owner Dashboard</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </NavLink>

              <NavLink
                to="/owner/venues"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-300 hover:bg-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
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
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'
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

          {isAuthenticated && user ? (
            <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{user.name}</div>
                  <div className="text-[11px] font-medium text-emerald-400">{role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-sm transition-colors"
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
