import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Sparkles,
  Tag,
  ArrowUpDown,
  Clock,
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingDown,
  Building2,
  SlidersHorizontal,
  RefreshCw,
  X,
  Trophy,
} from 'lucide-react';
import SportIcon from './ui/SportIcon';
import Button from './ui/Button';
import { fetchPriceComparison, fetchVenueMeta } from '../services/api';
import { getLocalDateString } from '../utils/date';

const TIME_SLOTS_12H = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
];

export default function CourtPriceComparison({ initialSport = '', initialCity = '' }) {
  const [sport, setSport] = useState(initialSport);
  const [city, setCity] = useState(initialCity);
  const [duration, setDuration] = useState(1);
  const [date, setDate] = useState(() => getLocalDateString());
  const [startTime, setStartTime] = useState('06:00 PM');
  const [indoor, setIndoor] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');

  const [meta, setMeta] = useState({ cities: [], sports: [] });
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVenueMeta()
      .then((m) => setMeta(m))
      .catch(() => {});
  }, []);

  const loadComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPriceComparison({
        sport,
        city,
        duration,
        date,
        startTime,
        indoor,
        sortBy,
      });
      setComparisonData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch price comparison data.');
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  }, [sport, city, duration, date, startTime, indoor, sortBy]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const summary = comparisonData?.summary;
  const comparisons = comparisonData?.comparisons || [];
  const pricingTier = comparisonData?.pricingTier;

  return (
    <div className="space-y-6">
      {/* Interactive Comparison Controls Bar */}
      <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#28303F]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Smart Price Comparison</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/30">
                  Live Rates
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Compare verified court rates, duration multipliers, and value ratings side-by-side.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadComparison}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181C24] hover:bg-[#202734] border border-[#28303F] text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-lime-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Sport */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="">All Sports</option>
              {meta.sports?.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="">All Cities</option>
              {meta.cities?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours (Continuous)</option>
              <option value={3}>3 Hours (Continuous)</option>
              <option value={4}>4 Hours (Continuous)</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Target Date</label>
            <input
              type="date"
              value={date}
              min={getLocalDateString()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
            </input>
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Start Time</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              {TIME_SLOTS_12H.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#28303F] text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="best_value">Best Value (Rating / Price)</option>
              <option value="rating_desc">Highest Rated</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Market Price Intelligence Summary Bar */}
      {summary && comparisons.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#0F131C] border border-emerald-500/30 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
              Lowest Rate
            </span>
            <div className="text-lg font-black text-white font-mono flex items-baseline gap-1">
              <span>₹{summary.minPricePerHour}</span>
              <span className="text-xs font-normal text-slate-400">/hr</span>
            </div>
            <div className="text-[10px] text-emerald-400/90 mt-1 font-semibold">
              Total ₹{summary.minPricePerHour * duration} for {duration} hr{duration > 1 ? 's' : ''}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0F131C] border border-[#28303F] shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Market Average
            </span>
            <div className="text-lg font-black text-slate-200 font-mono flex items-baseline gap-1">
              <span>₹{summary.avgPricePerHour}</span>
              <span className="text-xs font-normal text-slate-400">/hr</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Across matching courts
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0F131C] border border-[#28303F] shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Top Rate
            </span>
            <div className="text-lg font-black text-slate-300 font-mono flex items-baseline gap-1">
              <span>₹{summary.maxPricePerHour}</span>
              <span className="text-xs font-normal text-slate-400">/hr</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Premium tier facilities
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0F131C] border border-[#28303F] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Time Slot Status
            </span>
            <div>
              {pricingTier === 'PEAK' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  <Clock className="w-3 h-3" />
                  <span>Peak Evening Hours</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Tag className="w-3 h-3" />
                  <span>Off-Peak Great Value</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {startTime} • {duration} hr duration
            </div>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-lime-400 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-300">Comparing court rates across facilities…</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white mb-1">Failed to Compare Rates</h3>
          <p className="text-xs text-rose-300 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadComparison}>
            Retry Comparison
          </Button>
        </div>
      ) : comparisons.length === 0 ? (
        <div className="p-12 text-center bg-[#0F131C] border border-[#28303F] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-[#181C24] text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Matching Courts to Compare</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your sport or city filters to see pricing comparisons.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((item) => {
            return (
              <div
                key={item.courtId}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                  item.isBestPrice
                    ? 'bg-[#0F131C] border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                    : item.isBestValue
                    ? 'bg-[#0F131C] border-lime-400/60 shadow-lg shadow-lime-950/20'
                    : 'bg-[#0F131C] border-[#28303F] hover:border-slate-700'
                }`}
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.isBestPrice && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm">
                        <Tag className="w-3 h-3" />
                        <span>Best Price</span>
                      </span>
                    )}
                    {item.isBestValue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-lime-400/20 text-lime-300 border border-lime-400/50 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        <span>Best Value</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#181C24] text-slate-300 border border-[#28303F]">
                      {item.indoor ? 'Indoor' : 'Outdoor'}
                    </span>
                  </div>

                  {item.venue?.rating > 0 && (
                    <div className="flex items-center gap-1 bg-[#181C24] px-2 py-0.5 rounded-md border border-[#28303F] text-xs font-bold text-white">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-mono">{item.venue.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Court & Venue Identity */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2">
                    <SportIcon sport={item.sport} className="w-4 h-4 text-lime-400" />
                    <h3 className="font-extrabold text-white text-base leading-snug">
                      {item.courtName}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{item.venue?.name}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{item.venue?.city}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{item.venue?.location || item.venue?.address}</span>
                  </p>
                </div>

                {/* Price Breakdown Box */}
                <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#28303F] space-y-2 mb-4 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 font-sans font-medium">Hourly Rate:</span>
                    <span className="font-bold text-white">₹{item.pricePerHour}/hr</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 font-sans font-medium">Duration:</span>
                    <span>{item.durationHours} hr{item.durationHours > 1 ? 's' : ''} continuous</span>
                  </div>

                  <div className="pt-2 border-t border-[#28303F] flex items-baseline justify-between">
                    <span className="font-sans font-bold text-slate-200">Total Price:</span>
                    <span className="text-xl font-black text-lime-400">₹{item.totalPrice}</span>
                  </div>

                  {item.priceDiffFromAvg !== 0 && (
                    <div className="text-[10px] font-sans text-slate-400 pt-1">
                      {item.priceDiffFromAvg < 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          ₹{Math.abs(item.priceDiffFromAvg)}/hr lower than platform average
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          ₹{item.priceDiffFromAvg}/hr above platform average (Premium facility)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Direct CTA */}
                <Link
                  to={`/venues/${item.venue?.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-qc-lime transition-all focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <span>Select & Book Court</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
