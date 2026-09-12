import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity, LogOut, User, Building2, ShieldCheck,
  Menu, X, ChevronRight, Sparkles, CalendarCheck, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_META = {
  CUSTOMER:  { label: 'Player',       icon: User,        color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  OWNER:     { label: 'Venue Owner',  icon: Building2,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ADMIN:     { label: 'Admin',        icon: ShieldCheck, color: 'text-slate-700',   bg: 'bg-slate-100',  border: 'border-slate-300' },
};

export default function Header() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const meta = role ? ROLE_META[role] : null;
  const RoleIcon = meta?.icon;

  function handleLogout() {
    logout();
    setMobileMenuOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Core Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            to="/"
            className="flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl py-1 px-1.5 transition-opacity hover:opacity-95"
            aria-label="QuickCourt Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                Quick<span className="text-indigo-600">Court</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5">
                Sports Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — always discoverable */}
          <nav className="hidden sm:flex items-center gap-1.5 md:gap-2" aria-label="Main Navigation">
            <NavLink
              to="/venues"
              className={({ isActive }) =>
                `px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              Venues
            </NavLink>

            {isAuthenticated && role === 'CUSTOMER' && (
              <>
                <NavLink
                  to="/players"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Find Players</span>
                </NavLink>
                <NavLink
                  to="/my-bookings"
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  <span>My Bookings</span>
                </NavLink>
              </>
            )}

            {isAuthenticated && role === 'OWNER' && (
              <NavLink
                to="/owner/venues"
                className={({ isActive }) =>
                  `px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>My Venues</span>
              </NavLink>
            )}

            {isAuthenticated && role === 'ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-100 text-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right Side — Actions & Account */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Role pill */}
              {meta && (
                <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                  <RoleIcon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
              )}

              {/* User Avatar & Name */}
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-sm font-medium text-slate-800 max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>

              {/* Sign out */}
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/venues"
                className="hidden md:inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Find Courts
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="sm:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer / dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <NavLink
            to="/venues"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`
            }
          >
            <span>Explore Venues</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </NavLink>

          {isAuthenticated && role === 'CUSTOMER' && (
            <>
              <NavLink
                to="/players"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Find Players</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </NavLink>
              <NavLink
                to="/my-bookings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  <span>My Bookings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </NavLink>
            </>
          )}

          {isAuthenticated && role === 'OWNER' && (
            <NavLink
              to="/owner/venues"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>My Venues</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </NavLink>
          )}

          {isAuthenticated && role === 'ADMIN' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-slate-100 text-slate-800' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <span>Admin Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </NavLink>
          )}

          {isAuthenticated && user ? (
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.name}</div>
                  <div className="text-[11px] font-medium text-slate-500">{role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xs hover:bg-indigo-700 transition-colors"
              >
                Sign In / Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
