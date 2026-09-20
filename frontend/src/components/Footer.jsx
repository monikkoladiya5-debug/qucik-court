import React from 'react';
import { Activity, ArrowUpRight, ShieldCheck, Trophy, Users, Building2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { isAuthenticated, role } = useAuth();

  return (
    <footer className="bg-[#0B0F17] text-slate-400 py-12 mt-auto border-t border-[#28303F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center space-x-2.5 text-white mb-4">
            <div className="w-7 h-7 rounded-lg bg-lime-400 flex items-center justify-center text-slate-950 shadow-qc-lime">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black tracking-tight">
              Quick<span className="text-lime-400">Court</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs">
            Book premier sports venues and courts in seconds. Real-time availability for badminton, box cricket, football turfs, tennis & pickleball.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Discovery</h4>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li>
              <Link to="/venues" className="hover:text-lime-400 transition-colors">
                Explore All Venues
              </Link>
            </li>
            <li>
              <Link to="/venues?indoor=true" className="hover:text-lime-400 transition-colors">
                Indoor Arenas
              </Link>
            </li>
            <li>
              <Link to="/venues?indoor=false" className="hover:text-lime-400 transition-colors">
                Outdoor Turfs
              </Link>
            </li>
            <li>
              <Link to="/players" className="hover:text-lime-400 transition-colors">
                Find Players
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Sports</h4>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li>
              <Link to="/venues?sport=Badminton" className="hover:text-lime-400 transition-colors">
                Badminton Courts
              </Link>
            </li>
            <li>
              <Link to="/venues?sport=Cricket" className="hover:text-lime-400 transition-colors">
                Box Cricket Turfs
              </Link>
            </li>
            <li>
              <Link to="/venues?sport=Football" className="hover:text-lime-400 transition-colors">
                Football Turfs
              </Link>
            </li>
            <li>
              <Link to="/venues?sport=Tennis" className="hover:text-lime-400 transition-colors">
                Tennis Lawns
              </Link>
            </li>
            <li>
              <Link to="/venues?sport=Pickleball" className="hover:text-lime-400 transition-colors">
                Pickleball Courts
              </Link>
            </li>
          </ul>
        </div>

        <div>
          {isAuthenticated && role === 'OWNER' ? (
            <>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Facility Workspace</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link to="/owner/dashboard" className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                    <span>Operations Dashboard</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-500" />
                  </Link>
                </li>
                <li>
                  <Link to="/owner/venues" className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                    <span>Manage Courts & Venues</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-500" />
                  </Link>
                </li>
                <li>
                  <Link to="/notifications" className="hover:text-emerald-400 transition-colors">
                    Booking Notifications
                  </Link>
                </li>
              </ul>
            </>
          ) : isAuthenticated && role === 'ADMIN' ? (
            <>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Platform Administration</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link to="/admin/dashboard" className="hover:text-slate-200 transition-colors inline-flex items-center gap-1">
                    <span>Admin Command Center</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-500" />
                  </Link>
                </li>
                <li>
                  <Link to="/notifications" className="hover:text-slate-200 transition-colors">
                    Platform Alerts
                  </Link>
                </li>
              </ul>
            </>
          ) : (
            <>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Trust & Community</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link to="/venues" className="hover:text-lime-400 transition-colors">
                    Verified Facilities & Reviews
                  </Link>
                </li>
                <li>
                  <Link to="/players" className="hover:text-lime-400 transition-colors">
                    Player Matchmaking Directory
                  </Link>
                </li>
                {isAuthenticated && (
                  <li>
                    <Link to="/profile" className="hover:text-lime-400 transition-colors">
                      My Player Rewards & Badges
                    </Link>
                  </li>
                )}
                <li>
                  <Link to="/auth" className="text-slate-500 hover:text-slate-300 transition-colors text-xs">
                    Partner & Admin Access
                  </Link>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-[#28303F] flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 QuickCourt India. All rights reserved.</p>
        <p className="mt-2 md:mt-0 font-mono text-[11px]">
          Verified Sports Venue & Court Reservation Platform
        </p>
      </div>
    </footer>
  );
}
