import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface FullBleedProgressNoteSlideProps {
  isOpen: boolean;
  day: number;
  noteText: string;
  onContinue: () => void;
  isCoachPreview?: boolean;
  onExitPreview?: () => void;
}

export const FullBleedProgressNoteSlide: React.FC<FullBleedProgressNoteSlideProps> = ({
  isOpen,
  day,
  noteText,
  onContinue,
  isCoachPreview,
  onExitPreview,
}) => {
  if (!isOpen || !noteText || !noteText.trim()) return null;

  const content = (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 md:p-12 overflow-y-auto overflow-x-hidden">
      {/* Background Ambience matching Bridge Card */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 w-full max-w-md mx-auto flex justify-between items-center pt-2 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0E7850]/10 border border-[#0E7850]/20 rounded-full text-[#0E7850]">
          <Sparkles className="w-3.5 h-3.5 text-[#0E7850] animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider">
            Move {day} Progress
          </span>
        </div>

        {isCoachPreview && onExitPreview && (
          <button
            type="button"
            onClick={onExitPreview}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            Exit Preview
          </button>
        )}
      </div>

      {/* Main Progress Note Content */}
      <main className="relative z-10 max-w-md w-full mx-auto flex-1 flex flex-col justify-center items-start py-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="w-full text-left my-auto py-4"
        >
          <p className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight whitespace-pre-line">
            {noteText}
          </p>
        </motion.div>
      </main>

      {/* Continue CTA Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto py-2">
        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          onClick={() => {
            triggerHaptic(hapticPatterns.light);
            onContinue();
          }}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.button>
      </footer>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

export default FullBleedProgressNoteSlide;
