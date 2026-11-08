import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import FormattedText from './FormattedText';
import { formatInterpolatedText } from '../src/utils/stepPlaceholderUtils';

export interface SprintThoughtViewerProps {
  thoughts: string[];
  stepIndex: number;
  onComplete?: () => void;
  isCompleted?: boolean;
  isFullBleed?: boolean;
  dayContent?: any;
  taskInputs?: any;
  sprintDailyContent?: any;
  enrollmentProgress?: any;
  user?: any;
}

export const SprintThoughtViewer: React.FC<SprintThoughtViewerProps> = ({
  thoughts,
  stepIndex,
  onComplete,
  isCompleted = false,
  isFullBleed = false,
  dayContent,
  taskInputs,
  sprintDailyContent,
  enrollmentProgress,
  user,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasViewedLast, setHasViewedLast] = useState(isCompleted || thoughts.length <= 1);
  const [timerKey, setTimerKey] = useState(0); // Used to smoothly reset timer animation

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const validThoughts = thoughts.filter((t) => t && typeof t === 'string' && t.trim().length > 0);
  const total = validThoughts.length;

  // If completed externally or only 1 thought, mark viewed
  useEffect(() => {
    if (isCompleted || total <= 1) {
      setHasViewedLast(true);
      onCompleteRef.current?.();
    }
  }, [isCompleted, total]);

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(total - 1);
    }
  }, [currentIndex, total]);

  // Auto-advance after 5 seconds
  useEffect(() => {
    if (total <= 1) return;

    const timer = setTimeout(() => {
      if (currentIndex < total - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setTimerKey((k) => k + 1);
        if (nextIdx === total - 1) {
          setHasViewedLast(true);
          onCompleteRef.current?.();
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, total, timerKey]);

  if (total === 0) return null;

  const currentThoughtText = validThoughts[currentIndex] || '';
  const formattedThought = (() => {
    try {
      return formatInterpolatedText(
        currentThoughtText,
        dayContent,
        taskInputs,
        sprintDailyContent,
        enrollmentProgress,
        user
      );
    } catch {
      return currentThoughtText;
    }
  })();

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setTimerKey((k) => k + 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < total - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setTimerKey((k) => k + 1);
      if (nextIdx === total - 1) {
        setHasViewedLast(true);
        onCompleteRef.current?.();
      }
    }
  };

  const handleJump = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(idx);
    setTimerKey((k) => k + 1);
    if (idx === total - 1) {
      setHasViewedLast(true);
      onCompleteRef.current?.();
    }
  };

  return (
    <div
      className={`w-full mb-5 rounded-2xl sm:rounded-3xl border transition-all text-left overflow-hidden shadow-xs relative ${
        isFullBleed
          ? 'p-5 sm:p-7 bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/40 dark:via-zinc-900/50 dark:to-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40'
          : 'p-4 sm:p-6 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/30 dark:via-zinc-900/60 dark:to-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
      }`}
    >
      {/* 5-second animated progress countdown line across top */}
      {total > 1 && currentIndex < total - 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-100/60 dark:bg-emerald-950/60 overflow-hidden">
          <div
            key={timerKey}
            className="h-full bg-emerald-500/80 animate-thought-progress"
            style={{
              animation: 'thoughtProgress 5s linear forwards',
            }}
          />
        </div>
      )}

      {/* Header bar: Badge and Pagination Indicator */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-emerald-100/70 dark:border-emerald-900/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
            Thought
          </span>
          {total > 1 && (
            <span className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              {currentIndex + 1} of {total}
            </span>
          )}
        </div>

        {/* Lock / Unlocked Status Badge */}
        {total > 1 && (
          <div>
            {hasViewedLast ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full animate-fade-in">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Reviewed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200/60 dark:border-zinc-700">
                <span>View all to unlock</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Thought Text (bigger text, natural unveiling) */}
      <div
        key={`thought-${currentIndex}`}
        className="animate-fade-in text-gray-950 dark:text-zinc-100 py-1"
      >
        <p
          className={`font-bold leading-relaxed tracking-tight ${
            isFullBleed
              ? 'text-lg sm:text-xl md:text-2xl'
              : 'text-base sm:text-lg md:text-xl'
          }`}
        >
          <FormattedText text={formattedThought} />
        </p>
      </div>

      {/* Bottom Footer: ... Pagination Dots and Arrow Navigation */}
      {total > 1 && (
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-emerald-100/60 dark:border-emerald-900/30">
          {/* Pagination dots (...) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {validThoughts.map((_, dotIdx) => {
              const isActive = dotIdx === currentIndex;
              const isPast = dotIdx < currentIndex;
              return (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => handleJump(dotIdx, e)}
                  aria-label={`Jump to thought ${dotIdx + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'w-6 bg-emerald-600 dark:bg-emerald-400 shadow-2xs'
                      : isPast
                      ? 'w-2 bg-emerald-300 dark:bg-emerald-800 hover:bg-emerald-400'
                      : 'w-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300'
                  }`}
                  title={`Thought ${dotIdx + 1}`}
                />
              );
            })}
          </div>

          {/* Arrows for previous / next thought that unveils naturally */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous thought"
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                currentIndex > 0
                  ? 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 cursor-pointer active:scale-95 shadow-2xs'
                  : 'bg-transparent text-gray-300 dark:text-zinc-700 cursor-not-allowed border border-transparent'
              }`}
              title="Previous thought"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= total - 1}
              aria-label="Next thought"
              className={`px-2.5 h-7 rounded-xl flex items-center gap-1 text-xs font-bold transition-all ${
                currentIndex < total - 1
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40 cursor-default'
              }`}
              title={currentIndex < total - 1 ? 'Next thought' : 'Final thought reached'}
            >
              {currentIndex < total - 1 ? (
                <>
                  <span className="text-[11px] font-black uppercase tracking-wider">Next</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Completed</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintThoughtViewer;
