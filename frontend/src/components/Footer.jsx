import React from 'react';
import { Activity } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center space-x-2 text-white mb-4">
            <Activity className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold">QuickCourt</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Book sports facilities near you in seconds. Play badminton, tennis, football, basketball & pickleball.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Popular Sports</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Badminton</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Tennis</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Football</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Basketball</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Facility Owners</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/owner/dashboard" className="hover:text-white transition-colors">Owner Dashboard</a></li>
            <li><a href="/owner/venues" className="hover:text-white transition-colors">Manage Facilities</a></li>
            <li><a href="/auth" className="hover:text-white transition-colors">Partner With Us</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
        <p>© 2026 QuickCourt. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Verified Sports Venue & Court Reservation Platform.</p>
      </div>
    </footer>
  );
}
