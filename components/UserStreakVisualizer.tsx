import React, { useMemo } from 'react';
import { ParticipantSprint } from '../types';
import { Flame, Award, Calendar, TrendingUp, Check, Info } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface UserStreakVisualizerProps {
  enrollments: ParticipantSprint[];
}

export const UserStreakVisualizer: React.FC<UserStreakVisualizerProps> = ({ enrollments }) => {
  const stats = useMemo(() => {
    const completedDatesSet = new Set<string>();

    enrollments.forEach((e) => {
      // From progress
      if (e.progress) {
        e.progress.forEach((p) => {
          if (p.completed) {
            let dateStr = '';
            if (p.completedAt) {
              try {
                dateStr = format(parseISO(p.completedAt), 'yyyy-MM-dd');
              } catch (err) {
                // ignore
              }
            }
            // Fallback estimation using started_at and day index if completedAt is missing
            if (!dateStr && e.started_at) {
              try {
                const startedDate = parseISO(e.started_at);
                const targetDate = new Date(startedDate.getTime() + (p.day - 1) * 24 * 60 * 60 * 1000);
                dateStr = format(targetDate, 'yyyy-MM-dd');
              } catch (err) {
                // ignore
              }
            }
            if (dateStr) {
              completedDatesSet.add(dateStr);
            }
          }
        });
      }

      // From check-ins
      if (e.checkInHistory) {
        e.checkInHistory.forEach((ch) => {
          if (ch.timestamp) {
            try {
              const dateStr = format(parseISO(ch.timestamp), 'yyyy-MM-dd');
              completedDatesSet.add(dateStr);
            } catch (err) {
              // ignore
            }
          }
        });
      }
    });

    const sortedDates = Array.from(completedDatesSet).sort();
    
    let currentStreak = 0;
    let maxStreak = 0;

    if (sortedDates.length > 0) {
      // Calculate max streak
      let tempStreak = 1;
      maxStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        try {
          const prev = parseISO(sortedDates[i - 1]);
          const curr = parseISO(sortedDates[i]);
          const diff = differenceInDays(curr, prev);

          if (diff === 1) {
            tempStreak++;
            if (tempStreak > maxStreak) {
              maxStreak = tempStreak;
            }
          } else if (diff > 1) {
            tempStreak = 1;
          }
        } catch (err) {
          // ignore
        }
      }

      // Calculate current streak
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

      const hasToday = completedDatesSet.has(todayStr);
      const hasYesterday = completedDatesSet.has(yesterdayStr);

      if (hasToday || hasYesterday) {
        let streakCount = 1;
        let checkDate = hasToday ? today : yesterday;

        while (true) {
          const prevDay = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
          const prevDayStr = format(prevDay, 'yyyy-MM-dd');
          if (completedDatesSet.has(prevDayStr)) {
            streakCount++;
            checkDate = prevDay;
          } else {
            break;
          }
        }
        currentStreak = streakCount;
      } else {
        currentStreak = 0;
      }
    }

    // Generate recent 35 days (last 5 weeks)
    const today = new Date();
    const last35Days = Array.from({ length: 35 }).map((_, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - (34 - idx));
      return d;
    });

    let activeInLast30 = 0;
    last35Days.slice(-30).forEach((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (completedDatesSet.has(dateStr)) {
        activeInLast30++;
      }
    });

    const last30DaysConsistency = Math.round((activeInLast30 / 30) * 100);

    return {
      completedDatesSet,
      currentStreak,
      maxStreak,
      totalCompleted: completedDatesSet.size,
      last30DaysConsistency,
      last35Days,
    };
  }, [enrollments]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-lg font-black text-gray-900 italic">User Streak Ledger.</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Consecutive Task Completion Metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600">
          <Flame className="w-4 h-4 fill-current" />
          <span className="text-xs font-black tracking-tight">{stats.currentStreak} Day Streak</span>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100/60 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame className="w-12 h-12 text-orange-600" />
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            Current Active Streak
          </p>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {stats.currentStreak} <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Days</span>
          </p>
          <div className="mt-2.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (stats.currentStreak / 30) * 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide mt-1.5">
            {stats.currentStreak >= 30 ? 'Elite habits established!' : `${30 - stats.currentStreak} days to 30-day milestone`}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100/60 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award className="w-12 h-12 text-yellow-600" />
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            All-Time Longest Streak
          </p>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {stats.maxStreak} <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Days</span>
          </p>
          <div className="mt-2.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (stats.maxStreak / 30) * 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide mt-1.5">
            Maximum unbroken chain of execution
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100/60 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-12 h-12 text-emerald-600" />
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            Past 30 Days Consistency
          </p>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {stats.last30DaysConsistency}%
          </p>
          <div className="mt-2.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-primary rounded-full transition-all duration-1000"
              style={{ width: `${stats.last30DaysConsistency}%` }}
            />
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide mt-1.5">
            User completed tasks on {Math.round((stats.last30DaysConsistency / 100) * 30)} of last 30 days
          </p>
        </div>
      </div>

      {/* 35-Day (5-Week) Streak Grid Heatmap */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">35-Day Consistency Matrix</p>
          <div className="flex items-center gap-3 text-[9px] font-black text-gray-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200" /> Inactive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-primary" /> Task Completed
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-[1.75rem] border border-gray-100/60 p-6">
          <div className="grid grid-cols-7 gap-2.5 sm:gap-4 text-center">
            {/* Grid Headers: Days of the week abbreviated */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
              <span key={i} className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                {wd}
              </span>
            ))}

            {/* Heatmap Grid Elements */}
            {stats.last35Days.map((dateObj, idx) => {
              const dateStr = format(dateObj, 'yyyy-MM-dd');
              const isCompleted = stats.completedDatesSet.has(dateStr);
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

              return (
                <div 
                  key={idx}
                  className="flex flex-col items-center justify-center relative aspect-square group"
                >
                  <div 
                    className={`w-full max-w-[40px] aspect-square rounded-xl flex items-center justify-center font-black text-[10px] tracking-tight transition-all relative ${
                      isCompleted 
                        ? 'bg-[#0E7850] text-white shadow-sm shadow-[#0E7850]/20 scale-100 hover:scale-110 active:scale-95' 
                        : isToday
                          ? 'bg-white border-2 border-[#0E7850]/50 text-gray-700 font-black'
                          : 'bg-white border border-gray-100 hover:border-gray-300 text-gray-400 font-medium'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span>{format(dateObj, 'd')}</span>
                    )}

                    {/* Today indicator badge */}
                    {isToday && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-250 pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {format(dateObj, 'MMM d, yyyy')} • {isCompleted ? 'Completed ✓' : 'No Activity'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ledger Details */}
        <div className="mt-5 flex items-start gap-2.5 bg-sky-50/50 border border-sky-100 rounded-2xl p-4">
          <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] font-medium leading-relaxed text-sky-800 uppercase tracking-wide">
            Streaks are computed in real-time by analyzing the complete chronological log of distinct active days across all active, completed, or queued sprint enrollments and daily check-ins.
          </p>
        </div>
      </div>
    </div>
  );
};
