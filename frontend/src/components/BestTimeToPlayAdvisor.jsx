import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Clock, CheckCircle2, TrendingUp,
  AlertCircle, ChevronRight, ShieldCheck, Flame, Zap,
  Check, ArrowRight, RefreshCw, Info, Calendar
} from 'lucide-react';
import { fetchBestTimes } from '../services/api';

/**
 * BestTimeToPlayAdvisor Component
 * Advisory smart recommendation engine for player court schedules.
 */
export default function BestTimeToPlayAdvisor({
  venueId,
  courtId,
  date,
  courtName,
  onSelectSlotRange,
  selectedStartTime,
  selectedEndTime,
}) {
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'BEST_TIME' | 'GOOD_TIME' | 'POPULAR_TIME'

  const loadBestTimes = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBestTimes({
        venueId,
        courtId,
        date,
        duration,
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Unable to analyze schedule availability right now.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [venueId, courtId, date, duration]);

  useEffect(() => {
    loadBestTimes();
  }, [loadBestTimes]);

  const recommendations = data?.recommendations || [];
  const availableRecommendations = recommendations.filter((r) => r.isAvailable);

  const filteredList = availableRecommendations.filter((r) => {
    if (selectedFilter === 'ALL') return true;
    return r.category === selectedFilter;
  });

  const summary = data?.summary || {
    bestTimesCount: 0,
    goodTimesCount: 0,
    popularTimesCount: 0,
    unavailableCount: 0,
  };

  return (
    <div className="bg-[#0F131C] border border-[#28303F] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 text-slate-100">
      {/* Header & Advisor Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#28303F]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-400" />
              Smart Play Advisor
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-medium">Evidence-Based Recommendations</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
            Best Times to Play on {courtName || 'this Court'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Calculated from real-time slot occupancy, continuous duration availability, and historical demand.
          </p>
        </div>

        {/* Duration Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0B0F17] p-1 rounded-xl border border-[#28303F]">
          {[1, 2, 3, 4].map((hrs) => (
            <button
              key={hrs}
              type="button"
              onClick={() => setDuration(hrs)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                duration === hrs
                  ? 'bg-lime-400 text-slate-950 shadow-qc-lime'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {hrs} hr{hrs > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Summary Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSelectedFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            selectedFilter === 'ALL'
              ? 'bg-[#181C24] text-white border border-slate-600'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <span>All Available</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#0B0F17] text-slate-300">
            {availableRecommendations.length}
          </span>
        </button>

        {summary.bestTimesCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedFilter('BEST_TIME')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'BEST_TIME'
                ? 'bg-lime-400/15 text-lime-400 border border-lime-400/40 font-bold'
                : 'text-lime-400/80 hover:text-lime-400 border border-lime-400/20 bg-lime-400/5'
            }`}
          >
            <Sparkles className="w-3 h-3 text-lime-400" />
            <span>Best Times</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#0B0F17] text-lime-400">
              {summary.bestTimesCount}
            </span>
          </button>
        )}

        {summary.goodTimesCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedFilter('GOOD_TIME')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'GOOD_TIME'
                ? 'bg-sky-400/15 text-sky-400 border border-sky-400/40 font-bold'
                : 'text-sky-400/80 hover:text-sky-400 border border-sky-400/20 bg-sky-400/5'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-sky-400" />
            <span>Good Times</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#0B0F17] text-sky-400">
              {summary.goodTimesCount}
            </span>
          </button>
        )}

        {summary.popularTimesCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedFilter('POPULAR_TIME')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'POPULAR_TIME'
                ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40 font-bold'
                : 'text-amber-400/80 hover:text-amber-400 border border-amber-400/20 bg-amber-400/5'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Popular Slots</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#0B0F17] text-amber-400">
              {summary.popularTimesCount}
            </span>
          </button>
        )}
      </div>

      {/* Content State */}
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-lime-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Analyzing continuous slot availability…</span>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-[#0B0F17] rounded-xl border border-[#28303F] p-4">
          <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-300">No continuous {duration}-hour slots available matching this criteria.</p>
          <p className="text-[11px] text-slate-500 mt-1">Try selecting a shorter duration (e.g. 1 hour) or check another date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {filteredList.map((rec, idx) => {
            const isCurrentlySelected =
              selectedStartTime === rec.startTime && selectedEndTime === rec.endTime;

            const isBestTime = rec.category === 'BEST_TIME';
            const isGoodTime = rec.category === 'GOOD_TIME';
            const isPopular = rec.category === 'POPULAR_TIME';

            return (
              <div
                key={`${rec.startTime}-${rec.endTime}-${idx}`}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between text-xs relative ${
                  isCurrentlySelected
                    ? 'border-lime-400 bg-lime-400/10 ring-2 ring-lime-400/40 shadow-qc-lime'
                    : isBestTime
                    ? 'border-lime-400/40 bg-[#0B0F17] hover:border-lime-400/70 hover:bg-[#121722]'
                    : isGoodTime
                    ? 'border-sky-500/30 bg-[#0B0F17] hover:border-sky-400/60 hover:bg-[#121722]'
                    : 'border-[#28303F] bg-[#0B0F17] hover:border-slate-500 hover:bg-[#121722]'
                }`}
              >
                <div>
                  {/* Category Badge & Peak/Off-Peak Tag */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isBestTime
                          ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                          : isGoodTime
                          ? 'bg-sky-400/15 text-sky-400 border border-sky-400/30'
                          : isPopular
                          ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isBestTime && <Sparkles className="w-2.5 h-2.5" />}
                      {isPopular && <Flame className="w-2.5 h-2.5" />}
                      {rec.badgeLabel}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#181C24] px-2 py-0.5 rounded border border-[#28303F]">
                      {rec.isPeak ? 'Prime Peak' : 'Off-Peak'}
                    </span>
                  </div>

                  {/* Continuous Time Interval */}
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <div className="font-mono font-black text-white text-sm">
                      {rec.startTime} <span className="text-slate-500 font-sans font-normal">to</span> {rec.endTime}
                    </div>
                    <div className="font-mono font-bold text-xs text-lime-400">
                      ₹{rec.totalPrice} <span className="text-[10px] text-slate-500 font-sans">({duration}h)</span>
                    </div>
                  </div>

                  {/* Bulleted Rationale */}
                  <ul className="space-y-1 mb-3 text-[11px] text-slate-400">
                    {rec.reasons?.slice(0, 2).map((reason, rIdx) => (
                      <li key={rIdx} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 stroke-[2.5]" />
                        <span className="truncate">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => onSelectSlotRange(rec)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isCurrentlySelected
                      ? 'bg-lime-400 text-slate-950 shadow-qc-lime font-black'
                      : 'bg-[#181C24] hover:bg-lime-400 hover:text-slate-950 text-slate-200 border border-[#28303F] hover:border-lime-400'
                  }`}
                >
                  {isCurrentlySelected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Selected on Grid</span>
                    </>
                  ) : (
                    <>
                      <span>Choose this Time</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
