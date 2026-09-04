import React from 'react';
import { Flame, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyStreakWidgetProps {
  streak: number;
  bottomPosition?: string;
}

export const DailyStreakWidget: React.FC<DailyStreakWidgetProps> = ({ streak, bottomPosition = 'bottom-24' }) => {
  const startDay = streak <= 1 ? 1 : (streak % 2 === 0 ? streak - 1 : streak);
  const circles = [startDay, startDay + 1, startDay + 2];

  return (
    <div className={`fixed ${bottomPosition} right-4 sm:right-6 md:right-8 z-[200] pointer-events-none`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-gray-100/80 rounded-2xl p-2.5 flex items-center gap-2 pointer-events-auto"
      >
        <div className="flex items-center justify-center bg-orange-50 w-7 h-7 rounded-full text-orange-500 shadow-sm shrink-0">
          <Flame className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-1.5 pr-1">
          {circles.map(day => {
            const isCompleted = streak >= day;
            return (
              <div key={day} className="flex flex-col items-center gap-0.5 relative">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-orange-500 text-white shadow-sm scale-105' 
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
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
                        <Check className="w-3.5 h-3.5 stroke-[3.5]" />
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
