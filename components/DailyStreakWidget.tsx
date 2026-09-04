import React from 'react';
import { Flame, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DailyStreakWidgetProps {
  streak: number;
  bottomPosition?: string;
  showMarkForDay1?: boolean;
  onMarkDay1?: () => void;
}

export const DailyStreakWidget: React.FC<DailyStreakWidgetProps> = ({ 
  streak, 
  bottomPosition = 'bottom-20 sm:bottom-24',
  showMarkForDay1 = false,
  onMarkDay1
}) => {
  let circles: number[] = [1, 2, 3];
  if (streak >= 5) {
    const start = Math.max(1, streak - 2);
    const end = Math.min(7, start + 4);
    circles = [];
    for (let i = start; i <= end; i++) circles.push(i);
  } else if (streak >= 3) {
    circles = [1, 2, 3, 4, 5];
  } else {
    circles = [1, 2, 3];
  }

  return (
    <div className={`fixed ${bottomPosition} right-4 sm:right-6 md:right-8 z-[200] pointer-events-none flex flex-col items-end gap-1.5`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-[0_4px_25px_-4px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-zinc-800 rounded-2xl p-2.5 flex flex-col items-end gap-1.5 pointer-events-auto"
      >
        <div className="w-full flex flex-col items-center px-1">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Your Daily Streak
          </span>
          <div className="w-full h-[1px] bg-gray-100 dark:bg-zinc-800 my-1.5" />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-orange-50 dark:bg-orange-950/40 w-6 h-6 rounded-full text-orange-500 shadow-sm shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 pr-0.5">
            {circles.map(day => {
              const isCompleted = streak >= day;
              const isDay1 = day === 1;
              const isDay3 = day === 3;

              return (
                <div key={day} className="flex items-center gap-1 relative">
                  {isDay3 && (
                    <div className="text-gray-400 dark:text-zinc-500 flex items-center">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-0.5 relative">
                    <div 
                      onClick={isDay1 && showMarkForDay1 && onMarkDay1 ? onMarkDay1 : undefined}
                      title={isDay1 && showMarkForDay1 ? "Mark for Day 1" : undefined}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-orange-500 text-white shadow-sm scale-105' 
                          : isDay1 && showMarkForDay1
                            ? 'bg-[#0E7850] text-white shadow-md animate-pulse cursor-pointer hover:bg-[#085C3D]'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {isCompleted ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center justify-center"
                          >
                            <Check className="w-3 h-3 stroke-[3.5]" />
                          </motion.div>
                        ) : isDay1 && showMarkForDay1 ? (
                          <motion.span
                            key="mark"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[9px] uppercase tracking-tighter font-extrabold"
                          >
                            Mark
                          </motion.span>
                        ) : (
                          <motion.span
                            key="day"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {day}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};


