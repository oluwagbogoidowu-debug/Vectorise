import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, BookOpen, Sparkles, Trophy, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreateTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType?: (type: 'sprint' | 'blog' | 'ignite' | 'challenge') => void;
}

export const CreateTypeModal: React.FC<CreateTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  const navigate = useNavigate();

  const options = [
    {
      id: 'sprint',
      label: 'Sprint',
      desc: 'Multi-day action program with daily lessons & tasks',
      icon: Zap,
      colorClass: 'bg-emerald-50/50 text-emerald-700 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50',
      iconBgClass: 'bg-emerald-500 text-white',
    },
    {
      id: 'blog',
      label: 'Riseblog',
      desc: 'Publish insightful articles & growth guides',
      icon: BookOpen,
      colorClass: 'bg-blue-50/50 text-blue-700 border-blue-100 hover:border-blue-300 hover:bg-blue-50',
      iconBgClass: 'bg-blue-500 text-white',
    },
    {
      id: 'ignite',
      label: 'Ignite',
      desc: 'Daily bite-sized inspiration & prompt',
      icon: Sparkles,
      colorClass: 'bg-amber-50/50 text-amber-700 border-amber-100 hover:border-amber-300 hover:bg-amber-50',
      iconBgClass: 'bg-amber-500 text-white',
    },
    {
      id: 'challenge',
      label: 'Challenge',
      desc: 'Goal-driven participant action challenge',
      icon: Trophy,
      colorClass: 'bg-purple-50/50 text-purple-700 border-purple-100 hover:border-purple-300 hover:bg-purple-50',
      iconBgClass: 'bg-purple-500 text-white',
    },
  ];

  const handleSelect = (id: 'sprint' | 'blog' | 'ignite' | 'challenge') => {
    onClose();
    if (onSelectType) {
      onSelectType(id);
    } else {
      navigate(`/coach/sprint/new?tab=${id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            id="create-type-backdrop"
          />

          {/* Modal Content container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-sm bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-2xl flex flex-col z-10"
            id="create-type-content"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Content Creator
                </h4>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                id="create-type-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-5 px-1">
              <h3 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                Create New Content
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                Select what you would like to build
              </p>
            </div>

            {/* Options list */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar py-1 px-0.5">
              {options.map((opt) => {
                const IconComponent = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id as any)}
                    className={`group w-full flex items-center gap-4 p-4 rounded-3xl border text-left transition-all duration-300 active:scale-[0.98] cursor-pointer ${opt.colorClass}`}
                    id={`create-type-btn-${opt.id}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 ${opt.iconBgClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium leading-snug mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer notice */}
            <div className="mt-5 text-center px-2">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                Empower your participants with engaging experiences
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateTypeModal;
