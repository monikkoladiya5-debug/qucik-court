import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut, User, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_META = {
  CUSTOMER:  { label: 'Player',       icon: User,       color: 'text-purple-600', bg: 'bg-purple-50' },
  OWNER:     { label: 'Venue Owner',  icon: Building2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ADMIN:     { label: 'Admin',        icon: ShieldCheck, color: 'text-slate-700', bg: 'bg-slate-100' },
};

export default function Header() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const meta = role ? ROLE_META[role] : null;
  const RoleIcon = meta?.icon;

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Quick<span className="text-purple-600">Court</span>
            </span>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <>
              {/* Role badge */}
              {meta && (
                <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color} border border-slate-200`}>
                  <RoleIcon className="w-3 h-3" />
                  {meta.label}
                </span>
              )}
              {/* User name */}
              <span className="hidden md:block text-sm font-medium text-slate-700">
                {user.name}
              </span>
              {/* Logout */}
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600
                           bg-slate-50 hover:bg-red-50 hover:text-red-600
                           rounded-lg border border-slate-200 hover:border-red-200
                           transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700
                         rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
