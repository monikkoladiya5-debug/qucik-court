import React from 'react';
import { Activity } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Quick<span className="text-purple-600">Court</span></span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Foundation v1.0</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
          <span className="hover:text-purple-600 transition-colors cursor-pointer">Home</span>
          <span className="hover:text-purple-600 transition-colors cursor-pointer">Sports</span>
          <span className="hover:text-purple-600 transition-colors cursor-pointer">Venues</span>
          <span className="hover:text-purple-600 transition-colors cursor-pointer">My Bookings</span>
        </nav>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            Demo Status
          </button>
        </div>
      </div>
    </header>
  );
}
