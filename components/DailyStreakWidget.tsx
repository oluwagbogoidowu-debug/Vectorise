import React from 'react';
import { Flame, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DailyStreakWidgetProps {
  streak: number;
  bottomPosition?: string;
  showMarkForDay1?: boolean;
  onMarkDay1?: () => void;
}

export const DailyStreakWidget: React.FC<DailyStreakWidgetProps> = ({ 
  streak, 
  bottomPosition = 'bottom-6 sm:bottom-8',
  showMarkForDay1 = false,
  onMarkDay1
}) => {
  // Determine circles count and numbers based on requirement:
  // "The circles shouldn't be more than 3 to 4 at any time.
  // 1 to 3: 3 circles.
  // 3 to 5: 5 filled with 2 more (or total 5 circles) -> let's map:
  // Streak 1-3: 3 circles (1, 2, 3)
  // Streak 3-5: 5 circles (1, 2, 3, 4, 5)
  // Streak 5-7: 5 circles (3, 4, 5, 6, 7) or similar. Let's make it robust:
  // Up to 3 streak -> 3 circles (1, 2, 3)
  // 3 to 5 streak -> 5 circles (1..5)
  // 5 to 7 streak -> 5 circles (3..7) or general sliding window of 3 to 5 circles max.
  let circles: number[] = [1, 2, 3];
  if (streak >= 5) {
    const start = Math.max(1, streak - 2);
    const end = Math.min(7, start + 4);
    circles = [];
    for (let i = start; i <= end; i++) circles.push(i);
    if (circles.length < 5 && end === 7) {
      // pad or keep
    }
  } else if (streak >= 3) {
    circles = [1, 2, 3, 4, 5];
  } else {
    circles = [1, 2, 3];
  }

  return (
    <div className={`fixed ${bottomPosition} right-4 sm:right-6 md:right-8 z-[200] pointer-events-none flex flex-col items-end gap-1.5`}>
      {showMarkForDay1 && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          onClick={onMarkDay1}
          className="pointer-events-auto bg-[#0E7850] hover:bg-[#085C3D] text-white text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl shadow-lg shadow-[#0E7850]/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>Mark for Day 1</span>
        </motion.button>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-zinc-800 rounded-2xl p-2 flex items-center gap-1.5 pointer-events-auto"
      >
        <div className="flex items-center justify-center bg-orange-50 dark:bg-orange-950/40 w-6 h-6 rounded-full text-orange-500 shadow-sm shrink-0">
          <Flame className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1 pr-0.5">
          {circles.map(day => {
            const isCompleted = streak >= day;
            return (
              <div key={day} className="flex flex-col items-center gap-0.5 relative">
                <div 
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-orange-500 text-white shadow-sm scale-105' 
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
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

