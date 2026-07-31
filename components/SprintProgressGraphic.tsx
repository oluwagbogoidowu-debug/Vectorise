import React from 'react';
import { Check, Flame, Trophy } from 'lucide-react';

export interface SprintProgressGraphicProps {
  currentDay: number;
  totalDays: number;
  completedDaysCount: number;
  isCurrentDayCompleted?: boolean;
  activeStepIndex?: number;
  totalStepsCount?: number;
  isFullBleed?: boolean;
  className?: string;
}

export const SprintProgressGraphic: React.FC<SprintProgressGraphicProps> = ({
  currentDay,
  totalDays,
  completedDaysCount,
  isCurrentDayCompleted = false,
  activeStepIndex = 0,
  totalStepsCount = 1,
  isFullBleed = false,
  className = ''
}) => {
  const safeTotalDays = Math.max(1, totalDays);
  const overallPercent = Math.min(
    100,
    Math.round((completedDaysCount / safeTotalDays) * 100)
  );

  // Calculate current day step completion
  const stepPercent = isCurrentDayCompleted
    ? 100
    : Math.min(
        100,
        Math.round(((activeStepIndex + 1) / Math.max(1, totalStepsCount)) * 88)
      );

  // SVG Ring Calculations
  const radius = 28;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercent / 100) * circumference;

  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-4 shadow-sm transition-all duration-300 font-sans ${
        isFullBleed ? 'shadow-md ring-1 ring-emerald-500/10 mb-4' : ''
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: SVG Ring & Day Summary */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
              {/* Background Circle */}
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-emerald-500/10"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress Animated Arc */}
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-emerald-600 transition-all duration-700 ease-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {overallPercent === 100 ? (
                <Trophy className="w-5 h-5 text-emerald-600 animate-bounce" />
              ) : (
                <>
                  <span className="text-xs font-black text-gray-900 leading-none">
                    {overallPercent}%
                  </span>
                  <span className="text-[7px] font-bold text-emerald-700 uppercase tracking-tighter mt-0.5">
                    Done
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-0.5 text-left min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                <Flame className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                Day {currentDay} of {safeTotalDays}
              </span>
              {isCurrentDayCompleted && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-600 text-white">
                  <Check className="w-2.5 h-2.5" /> Completed
                </span>
              )}
            </div>
            <p className="text-xs font-extrabold text-gray-800 truncate">
              {completedDaysCount} of {safeTotalDays} Days Completed
            </p>
            <p className="text-[10px] font-medium text-gray-400 truncate">
              {isCurrentDayCompleted
                ? 'All tasks finished for today!'
                : `Step ${activeStepIndex + 1} of ${totalStepsCount} in progress`}
            </p>
          </div>
        </div>

        {/* Right: Multi-segment Day Indicators + Step Bar */}
        <div className="w-full sm:w-auto sm:max-w-xs flex flex-col justify-center gap-2">
          {/* Day Segment Dots Graphic */}
          <div className="flex items-center justify-between gap-1 w-full">
            {Array.from({ length: safeTotalDays }, (_, idx) => {
              const dayNum = idx + 1;
              const isPastCompleted = dayNum <= completedDaysCount || (dayNum === currentDay && isCurrentDayCompleted);
              const isCurrent = dayNum === currentDay;

              return (
                <div
                  key={dayNum}
                  title={`Day ${dayNum}`}
                  className={`h-2.5 flex-1 rounded-full transition-all duration-300 relative ${
                    isPastCompleted
                      ? 'bg-emerald-500 shadow-sm'
                      : isCurrent
                      ? 'bg-emerald-600 ring-2 ring-emerald-300 animate-pulse'
                      : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Action Step Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-gray-500">
              <span>Today’s Progress</span>
              <span className="text-emerald-700 font-extrabold">{stepPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden shadow-inner">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
