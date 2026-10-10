import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, BarChart3, TrendingUp, Users, CheckCircle2, Calendar, Sparkles,
  ArrowLeft, Activity, Layers, Flame, ArrowUpRight
} from 'lucide-react';
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
  initialSprintId?: string;
}

type AnalyticsType = 'enrollment' | 'completion';
type PresetDuration = '7d' | '14d' | '30d' | 'all';

export const CoachSprintAnalyticsModal: React.FC<CoachSprintAnalyticsModalProps> = ({
  isOpen,
  onClose,
  sprints,
  enrollments,
  userId,
  initialSprintId,
}) => {
  const storageKey = `coach_default_analytics_sprint_${userId || 'general'}`;

  // 1. Persisted selected sprint ID
  const [selectedSprintId, setSelectedSprintId] = useState<string>(() => {
    if (initialSprintId && sprints.some(s => s.id === initialSprintId)) {
      return initialSprintId;
    }
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

  // Keep selectedSprintId valid against current sprints list or initialSprintId
  useEffect(() => {
    if (initialSprintId && sprints.some(s => s.id === initialSprintId) && selectedSprintId !== initialSprintId) {
      setSelectedSprintId(initialSprintId);
      return;
    }

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
  }, [sprints, selectedSprintId, storageKey, initialSprintId]);

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

  // Daily telemetry logs sorted reverse-chronologically for breakdown table
  const dailyTelemetryLogs = useMemo(() => {
    const maxVal = Math.max(1, ...chartData.map(d => d.count));
    return [...chartData].reverse().slice(0, 14).map(item => ({
      ...item,
      percentageOfMax: Math.round((item.count / maxVal) * 100),
      percentageOfTotal: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
    }));
  }, [chartData, totalCount]);

  // Sprint select options styled like Coach Participant page
  const sprintOptions = useMemo(() => {
    return sprints.map(s => ({
      value: s.id,
      label: s.title || (s.contentType === 'ignite' ? s.igniteBody?.slice(0, 30) || 'Ignite' : 'Untitled Sprint')
    }));
  }, [sprints]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="coach-sprint-analytics-fullbleed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] bg-gray-50/80 dark:bg-zinc-950 flex flex-col overflow-y-auto text-left select-none custom-scrollbar animate-fade-in"
      >
        {/* Full Bleed Sticky Header Bar */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#0E7850]/10 text-[#0E7850] flex items-center justify-center shrink-0 border border-[#0E7850]/15 shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">
                  Coach Analytics
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/50">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  Full Bleed
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate max-w-xs sm:max-w-md mt-0.5">
                {currentSprint?.title || 'Selected Sprint Telemetry'}
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Metric Mode Toggle (Enrollment / Completion) in Top Bar */}
            <div className="inline-flex items-center bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl border border-gray-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setAnalyticsType('enrollment')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  analyticsType === 'enrollment'
                    ? 'bg-[#0E7850] text-white shadow-xs'
                    : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Enrollment</span>
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsType('completion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  analyticsType === 'completion'
                    ? 'bg-[#0E7850] text-white shadow-xs'
                    : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Completion</span>
              </button>
            </div>

            {/* Done / Exit button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:px-4 sm:py-2 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              title="Close Analytics"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Done</span>
            </button>
          </div>
        </header>

        {/* Full Bleed Main Workspace */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Top Control Panel: Sprint Picker & Date Range */}
          <section className="bg-white dark:bg-zinc-900 p-5 sm:p-7 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-xs relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              {/* Pick Sprint Dropdown */}
              <div className="lg:col-span-5">
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-zinc-400 tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  Select Sprint
                </label>
                {sprintOptions.length > 0 ? (
                  <CustomSelect
                    value={selectedSprintId}
                    onChange={(val) => handleSprintChange(String(val))}
                    options={sprintOptions}
                    placeholder="Choose a sprint..."
                  />
                ) : (
                  <div className="px-5 py-3.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/60 rounded-2xl text-xs font-bold text-gray-400">
                    No Sprints Available
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-1.5 ml-1">
                  <span>*Saved as default sprint across sessions</span>
                  <span className="font-bold text-[#0E7850]">{sprintEnrollments.length} total participants</span>
                </div>
              </div>

              {/* Date Presets & Inputs */}
              <div className="lg:col-span-7 bg-gray-50/70 dark:bg-zinc-800/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0E7850]" />
                    Date Window ({chartData.length} days selected)
                  </span>

                  {/* Preset Pills */}
                  <div className="inline-flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-xs self-start sm:self-auto">
                    {(['7d', '14d', '30d', 'all'] as PresetDuration[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activePreset === preset
                            ? 'bg-[#0E7850] text-white shadow-xs'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {preset === '7d' ? '7D' : preset === '14d' ? '14D' : preset === '30d' ? '30D' : 'All Time'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-gray-400 dark:text-zinc-400 tracking-widest mb-1 ml-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setActivePreset('30d');
                      }}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-200 shadow-xs focus:ring-4 focus:ring-primary/5 focus:border-[#0E7850] outline-none transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-gray-400 dark:text-zinc-400 tracking-widest mb-1 ml-1">
                      To Date
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
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-200 shadow-xs focus:ring-4 focus:ring-primary/5 focus:border-[#0E7850] outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance KPI Cards (Full Width Grid) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {/* 1. Period Volume */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-400">
                  {analyticsType === 'enrollment' ? 'Period Enrollments' : 'Period Completions'}
                </span>
                <div className="w-7 h-7 rounded-xl bg-[#0E7850]/10 text-[#0E7850] flex items-center justify-center">
                  {analyticsType === 'enrollment' ? <Users className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                {totalCount}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#0E7850] font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active period volume</span>
              </div>
            </div>

            {/* 2. Daily Average */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-400">
                  Daily Average
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#0E7850] leading-none tracking-tight">
                {dailyAverage}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                <span>Per-day velocity rate</span>
              </div>
            </div>

            {/* 3. Peak Volume Day */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-400">
                  Peak Day
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate" title={`${peakDay.name} (${peakDay.count})`}>
                {peakDay.name}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 rounded-full border border-amber-200/60 dark:border-amber-800/50">
                  {peakDay.count} recorded
                </span>
              </div>
            </div>

            {/* 4. Lifetime Completion Rate */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-400">
                  Completion Rate
                </span>
                <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                {lifetimeStats.completionRate}%
              </p>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate">
                <span>{lifetimeStats.totalCompleted} done / {lifetimeStats.totalEnrolled} enrolled</span>
              </div>
            </div>
          </section>

          {/* Full-Bleed Visual Momentum Chart Section */}
          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-9 border border-gray-100 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E7850]/10 text-[#0E7850] rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                  <TrendingUp className="w-3 h-3" />
                  Active Trajectory Engine
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {analyticsType === 'enrollment' ? 'Enrollment Pattern Over Time' : 'Completion Trajectory Over Time'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-medium mt-1">
                  Chronological progression for <span className="font-bold text-gray-800 dark:text-zinc-200">{currentSprint?.title || 'Selected Sprint'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700 rounded-xl text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-[#0E7850]" />
                  {fromDate} — {toDate}
                </span>
              </div>
            </div>

            {/* Expansive Full-Bleed Chart Container */}
            <div className="h-[280px] sm:h-[360px] md:h-[400px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="coachAnalyticsAreaColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0E7850" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0E7850" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 800, fill: '#9CA3AF' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 800, fill: '#9CA3AF' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        backgroundColor: '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        boxShadow: '0 12px 24px -4px rgba(0,0,0,0.25)',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '10px 16px'
                      }}
                      itemStyle={{ color: '#10B981' }}
                      labelStyle={{ color: '#E5E7EB', marginBottom: '4px' }}
                      formatter={(val: any) => [val, analyticsType === 'enrollment' ? 'Enrollments' : 'Completions']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0E7850"
                      strokeWidth={3.5}
                      fillOpacity={1}
                      fill="url(#coachAnalyticsAreaColor)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <BarChart3 className="w-10 h-10 mb-3 opacity-30 text-gray-400" />
                  <p className="text-sm font-bold text-gray-600 dark:text-zinc-300">No telemetry recorded for this timeframe.</p>
                  <p className="text-xs text-gray-400 mt-1">Adjust the dates above or pick a different sprint to examine activity.</p>
                </div>
              )}
            </div>
          </section>

          {/* Daily Activity Telemetry Breakdown (Full-Bleed Table) */}
          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight">
                  Daily Velocity Breakdown
                </h3>
                <p className="text-xs text-gray-400 dark:text-zinc-400 font-medium">
                  Recent day-by-day record of {analyticsType === 'enrollment' ? 'enrollment signups' : 'successful completions'}
                </p>
              </div>
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                Showing recent {dailyTelemetryLogs.length} days
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-[10px] font-black uppercase text-gray-400 dark:text-zinc-400 tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Metric Volume</th>
                    <th className="py-3 px-3">Share of Period</th>
                    <th className="py-3 px-3 text-right">Relative Momentum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800 text-xs font-bold">
                  {dailyTelemetryLogs.map((log) => (
                    <tr key={log.fullDate} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-3 text-gray-900 dark:text-zinc-200">
                        {log.name} <span className="text-[10px] text-gray-400 font-medium ml-1">({log.fullDate})</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                          log.count > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
                        }`}>
                          {log.count} {analyticsType === 'enrollment' ? 'enrolled' : 'completed'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-gray-600 dark:text-zinc-400 font-semibold">
                        {log.percentageOfTotal}%
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="w-36 ml-auto flex items-center justify-end gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0E7850] h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(4, log.percentageOfMax)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 w-8 text-right font-black">
                            {log.percentageOfMax}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Full Bleed Footer Action Bar */}
          <footer className="pt-2 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telemetry synchronized live with student engagement database</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              Done & Return to Dashboard
            </button>
          </footer>
        </main>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoachSprintAnalyticsModal;
