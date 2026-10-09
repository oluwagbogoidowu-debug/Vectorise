import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, TrendingUp, Users, CheckCircle2, Calendar, Sparkles } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Sprint, ParticipantSprint } from '../types';
import CustomSelect from './CustomSelect';
import { sprintService } from '../services/sprintService';

interface CoachSprintAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprints: Sprint[];
  enrollments: ParticipantSprint[];
  userId: string;
}

type AnalyticsType = 'enrollment' | 'completion';
type PresetDuration = '7d' | '14d' | '30d' | 'all';

export const CoachSprintAnalyticsModal: React.FC<CoachSprintAnalyticsModalProps> = ({
  isOpen,
  onClose,
  sprints,
  enrollments,
  userId,
}) => {
  const storageKey = `coach_default_analytics_sprint_${userId || 'general'}`;

  // 1. Persisted selected sprint ID
  const [selectedSprintId, setSelectedSprintId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && sprints.some(s => s.id === stored)) {
        return stored;
      }
    } catch {}
    return sprints[0]?.id || '';
  });

  // 2. Analytics type: Enrollment or Completion
  const [analyticsType, setAnalyticsType] = useState<AnalyticsType>('enrollment');

  // 3. Date range: From - To
  const [activePreset, setActivePreset] = useState<PresetDuration>('14d');
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });

  // Local copy of enrollments if additional fetching needed
  const [localEnrollments, setLocalEnrollments] = useState<ParticipantSprint[]>(enrollments);

  // Sync / load enrollments when modal opens
  useEffect(() => {
    if (enrollments && enrollments.length > 0) {
      setLocalEnrollments(enrollments);
    } else if (isOpen && sprints.length > 0) {
      sprintService.getEnrollmentsForSprints(sprints.map(s => s.id)).then(fetched => {
        setLocalEnrollments(fetched);
      }).catch(err => {
        console.warn("[SprintAnalytics] Failed to fetch enrollments:", err);
      });
    }
  }, [enrollments, isOpen, sprints]);

  // Keep selectedSprintId valid against current sprints list
  useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && sprints.some(s => s.id === stored)) {
          setSelectedSprintId(stored);
          return;
        }
      } catch {}
      const fallbackId = sprints[0].id;
      setSelectedSprintId(fallbackId);
      try {
        localStorage.setItem(storageKey, fallbackId);
      } catch {}
    } else if (selectedSprintId && sprints.length > 0 && !sprints.some(s => s.id === selectedSprintId)) {
      const fallbackId = sprints[0].id;
      setSelectedSprintId(fallbackId);
      try {
        localStorage.setItem(storageKey, fallbackId);
      } catch {}
    }
  }, [sprints, selectedSprintId, storageKey]);

  // Handle sprint change and persist as default
  const handleSprintChange = (newSprintId: string) => {
    setSelectedSprintId(newSprintId);
    try {
      localStorage.setItem(storageKey, newSprintId);
    } catch (e) {
      console.warn("[SprintAnalytics] Unable to persist default sprint ID:", e);
    }
  };

  // Preset duration buttons handler
  const handleApplyPreset = (preset: PresetDuration) => {
    setActivePreset(preset);
    const today = new Date();
    const toIso = today.toISOString().slice(0, 10);
    setToDate(toIso);

    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().slice(0, 10));
    } else if (preset === '14d') {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      setFromDate(d.toISOString().slice(0, 10));
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      // Find earliest enrollment date for this sprint or default to 60 days
      const sprintEnrolls = localEnrollments.filter(e => e.sprint_id === selectedSprintId);
      if (sprintEnrolls.length > 0) {
        const dates = sprintEnrolls
          .map(e => e.started_at ? new Date(e.started_at).getTime() : 0)
          .filter(t => t > 0);
        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates));
          setFromDate(earliest.toISOString().slice(0, 10));
          return;
        }
      }
      const d = new Date();
      d.setDate(d.getDate() - 60);
      setFromDate(d.toISOString().slice(0, 10));
    }
  };

  // Find currently selected sprint object
  const currentSprint = useMemo(() => {
    return sprints.find(s => s.id === selectedSprintId) || null;
  }, [sprints, selectedSprintId]);

  // Filter enrollments for the selected sprint
  const sprintEnrollments = useMemo(() => {
    return localEnrollments.filter(e => e.sprint_id === selectedSprintId);
  }, [localEnrollments, selectedSprintId]);

  // Generate chart data points between fromDate and toDate
  const { chartData, totalCount, dailyAverage, peakDay } = useMemo(() => {
    if (!fromDate || !toDate) {
      return { chartData: [], totalCount: 0, dailyAverage: '0.0', peakDay: { name: 'None', count: 0 } };
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    // Swap if user inadvertently entered from > to
    const actualStart = start <= end ? start : end;
    const actualEnd = start <= end ? end : start;

    const days: { dateStr: string; label: string }[] = [];
    const current = new Date(actualStart);
    while (current <= actualEnd) {
      const dateStr = current.toISOString().slice(0, 10);
      const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ dateStr, label });
      current.setDate(current.getDate() + 1);
    }

    // Tally counts per day
    const dayCountMap: Record<string, number> = {};
    days.forEach(d => {
      dayCountMap[d.dateStr] = 0;
    });

    sprintEnrollments.forEach(e => {
      if (analyticsType === 'enrollment') {
        const rawDate = e.started_at || (e as any).enrolledAt || (e as any).createdAt;
        if (rawDate) {
          try {
            const dStr = new Date(rawDate).toISOString().slice(0, 10);
            if (dayCountMap[dStr] !== undefined) {
              dayCountMap[dStr] += 1;
            }
          } catch {}
        }
      } else {
        // Completion analytics: check e.completed_at or progress completion dates
        let completionDateStr: string | null = null;
        if (e.status === 'completed' || e.completed_at) {
          const compRaw = e.completed_at || e.last_activity_at || e.started_at;
          if (compRaw) {
            try {
              completionDateStr = new Date(compRaw).toISOString().slice(0, 10);
            } catch {}
          }
        } else if (Array.isArray(e.progress)) {
          // If all days or latest completed step
          const completedSteps = e.progress.filter(p => p.completed && p.completedAt);
          if (completedSteps.length > 0) {
            const latest = completedSteps[completedSteps.length - 1];
            if (latest.completedAt) {
              try {
                completionDateStr = new Date(latest.completedAt).toISOString().slice(0, 10);
              } catch {}
            }
          }
        }

        if (completionDateStr && dayCountMap[completionDateStr] !== undefined) {
          dayCountMap[completionDateStr] += 1;
        }
      }
    });

    let maxCount = -1;
    let peakLabel = 'None';
    let sum = 0;

    const data = days.map(d => {
      const count = dayCountMap[d.dateStr] || 0;
      sum += count;
      if (count > maxCount) {
        maxCount = count;
        peakLabel = d.label;
      }
      return {
        name: d.label,
        fullDate: d.dateStr,
        count
      };
    });

    const avg = days.length > 0 ? (sum / days.length).toFixed(1) : '0.0';

    return {
      chartData: data,
      totalCount: sum,
      dailyAverage: avg,
      peakDay: { name: maxCount > 0 ? peakLabel : 'None', count: Math.max(0, maxCount) }
    };
  }, [fromDate, toDate, sprintEnrollments, analyticsType]);

  // Overall sprint lifetime stats
  const lifetimeStats = useMemo(() => {
    const totalEnrolled = sprintEnrollments.length;
    const totalCompleted = sprintEnrollments.filter(e => e.status === 'completed' || !!e.completed_at).length;
    const rate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;
    return {
      totalEnrolled,
      totalCompleted,
      completionRate: rate
    };
  }, [sprintEnrollments]);

  // Sprint select options styled like Coach Participant page
  const sprintOptions = useMemo(() => {
    return sprints.map(s => ({
      value: s.id,
      label: s.title || (s.contentType === 'ignite' ? s.igniteBody?.slice(0, 30) || 'Ignite' : 'Untitled Sprint')
    }));
  }, [sprints]);

  const typeOptions = [
    { value: 'enrollment', label: 'Enrollment' },
    { value: 'completion', label: 'Completion' }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-6 sm:p-9 z-10 my-auto overflow-hidden select-none"
        >
          {/* Subtle Ambient Decorative Gradient Glow */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-50 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Modal Header */}
          <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0E7850]/10 text-[#0E7850] flex items-center justify-center shrink-0 shadow-sm border border-[#0E7850]/15">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-800 mb-1 border border-emerald-100">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  Coach Performance Engine
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Sprint Analytics
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Close Analytics"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Top Controls Grid: Pick Sprint, Analytics Type, Duration */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Pick Sprint Dropdown (Coach Participant Style) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5 ml-1">
                  Pick Sprint
                </label>
                {sprintOptions.length > 0 ? (
                  <CustomSelect
                    value={selectedSprintId}
                    onChange={(val) => handleSprintChange(String(val))}
                    options={sprintOptions}
                    placeholder="Choose a sprint..."
                  />
                ) : (
                  <div className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-400">
                    No Sprints Available
                  </div>
                )}
                {selectedSprintId && (
                  <p className="text-[10px] text-gray-400 font-medium mt-1 ml-1">
                    *Saved as default sprint across sessions
                  </p>
                )}
              </div>

              {/* Analytics Type Dropdown (Enrollment or Completion) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5 ml-1">
                  Analytics Type
                </label>
                <CustomSelect
                  value={analyticsType}
                  onChange={(val) => setAnalyticsType(val as AnalyticsType)}
                  options={typeOptions}
                  placeholder="Select analytics metric..."
                />
              </div>
            </div>

            {/* Time Duration from to */}
            <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Time Duration Range
                </span>

                {/* Quick Presets */}
                <div className="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-xs">
                  {(['7d', '14d', '30d', 'all'] as PresetDuration[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activePreset === preset
                          ? 'bg-[#0E7850] text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {preset === '7d' ? '7D' : preset === '14d' ? '14D' : preset === '30d' ? '30D' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1 ml-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setActivePreset('30d');
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-xs focus:ring-4 focus:ring-primary/5 focus:border-[#0E7850] outline-none transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1 ml-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setActivePreset('30d');
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-xs focus:ring-4 focus:ring-primary/5 focus:border-[#0E7850] outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                Period {analyticsType === 'enrollment' ? 'Enrollments' : 'Completions'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
                {totalCount}
              </p>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                Daily Average
              </p>
              <p className="text-xl sm:text-2xl font-black text-[#0E7850] leading-none">
                {dailyAverage}
              </p>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                Peak Day
              </p>
              <p className="text-sm sm:text-base font-black text-gray-900 leading-tight truncate" title={`${peakDay.name} (${peakDay.count})`}>
                {peakDay.name} <span className="text-xs text-gray-400 font-bold">({peakDay.count})</span>
              </p>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                Completion Rate
              </p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
                {lifetimeStats.completionRate}%
              </p>
            </div>
          </div>

          {/* Graph Section: Participant Analytics Styling */}
          <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 border border-gray-100 shadow-xs">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Visual Momentum
                </h3>
                <p className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  {analyticsType === 'enrollment' ? 'Enrollment Pattern' : 'Completion Trajectory'}
                </p>
                <p className="text-[11px] text-gray-500 font-medium truncate max-w-md">
                  {currentSprint?.title || 'Selected Sprint'}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E7850]/10 text-[#0E7850] rounded-full text-[10px] font-black uppercase tracking-widest">
                  <TrendingUp className="w-3 h-3" />
                  Active Velocity
                </span>
              </div>
            </div>

            <div className="h-[220px] sm:h-[260px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="coachAnalyticsAreaColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0E7850" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="#0E7850" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 10px 20px -3px rgba(0,0,0,0.12)',
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        padding: '10px 14px'
                      }}
                      formatter={(val: any) => [val, analyticsType === 'enrollment' ? 'Enrollments' : 'Completions']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0E7850"
                      strokeWidth={3.5}
                      fillOpacity={1}
                      fill="url(#coachAnalyticsAreaColor)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <BarChart3 className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
                  <p className="text-xs font-bold text-gray-500">No telemetry data recorded for this time duration.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Adjust dates above or select another sprint.</p>
                </div>
              )}
            </div>
          </section>

          {/* Bottom Close Action */}
          <div className="flex justify-end pt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CoachSprintAnalyticsModal;
