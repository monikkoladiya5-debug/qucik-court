import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { fetchHealth, fetchSummary } from './services/api';
import { Activity, Server, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const hData = await fetchHealth();
      const sData = await fetchSummary();
      setHealth(hData);
      setSummary(sData);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            <span>TASK 0 — Foundation Ready</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Quick<span className="text-purple-600">Court</span> Platform Core
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Full-stack sports court booking engine powered by React, Vite, Tailwind CSS, Express, and an in-memory data store.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Express API Server</h3>
            <p className="text-sm text-slate-500 mb-4">Node.js Express backend serving REST APIs on port 5000.</p>
            <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              {loading ? 'Checking status...' : health?.status === 'ok' ? 'Connected & Healthy' : 'Disconnected'}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">In-Memory Data Store</h3>
            <p className="text-sm text-slate-500 mb-4">Pre-seeded with demo venues, courts, bookings, and users.</p>
            <div className="text-xs text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">
              {loading ? 'Loading store summary...' : `${summary?.venuesCount || 0} Venues | ${summary?.usersCount || 0} Users | ${summary?.bookingsCount || 0} Bookings`}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">RBAC Architecture</h3>
            <p className="text-sm text-slate-500 mb-4">Structured role access for Customer, Venue Owner & Admin.</p>
            <div className="flex space-x-2 text-xs font-semibold text-slate-700">
              <span className="px-2 py-0.5 rounded bg-slate-100">Customer</span>
              <span className="px-2 py-0.5 rounded bg-slate-100">Owner</span>
              <span className="px-2 py-0.5 rounded bg-slate-100">Admin</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
