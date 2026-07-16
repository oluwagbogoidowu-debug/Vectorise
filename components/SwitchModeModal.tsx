import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Handshake, User as UserIcon, X } from 'lucide-react';
import { UserRole } from '../types';

interface SwitchModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  activeRole: UserRole;
  onSelectMode: (role: UserRole, route: string) => void;
}

export const SwitchModeModal: React.FC<SwitchModeModalProps> = ({
  isOpen,
  onClose,
  user,
  activeRole,
  onSelectMode,
}) => {
  if (!user) return null;

  const getActivatedModes = () => {
    const modes = [];

    // Admin mode is activated if the user's base role is ADMIN
    if (user.role === UserRole.ADMIN) {
      modes.push({
        id: UserRole.ADMIN,
        label: 'Admin',
        role: UserRole.ADMIN,
        desc: 'Full System Control & Settings',
        icon: Shield,
        colorClass: activeRole === UserRole.ADMIN 
          ? 'bg-rose-50 text-rose-600 border-rose-200 ring-2 ring-rose-500/20' 
          : 'bg-white text-gray-700 border-gray-100 hover:border-rose-100 hover:bg-rose-50/10',
        iconBgClass: activeRole === UserRole.ADMIN
          ? 'bg-rose-500 text-white'
          : 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white',
        route: '/admin/dashboard'
      });
    }

    // Coach mode is activated if they are an admin OR if they are a coach or have an approved coach application
    const isApprovedCoach = user.role === UserRole.COACH || user.coachApplicationApproved === true || user.approved === true;
    if (user.role === UserRole.ADMIN || isApprovedCoach) {
      modes.push({
        id: UserRole.COACH,
        label: 'Coach',
        role: UserRole.COACH,
        desc: 'Active Coaching Space & Tools',
        icon: Users,
        colorClass: activeRole === UserRole.COACH 
          ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-500/20' 
          : 'bg-white text-gray-700 border-gray-100 hover:border-blue-100 hover:bg-blue-50/10',
        iconBgClass: activeRole === UserRole.COACH
          ? 'bg-blue-500 text-white'
          : 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
        route: '/coach/dashboard'
      });
    }

    // Partner mode is activated if they are an admin OR if their role is partner
    if (user.role === UserRole.ADMIN || user.role === UserRole.PARTNER) {
      modes.push({
        id: UserRole.PARTNER,
        label: 'Partner',
        role: UserRole.PARTNER,
        desc: 'Partner Collaboration Portal',
        icon: Handshake,
        colorClass: activeRole === UserRole.PARTNER 
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 ring-2 ring-emerald-500/20' 
          : 'bg-white text-gray-700 border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/10',
        iconBgClass: activeRole === UserRole.PARTNER
          ? 'bg-emerald-500 text-white'
          : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
        route: '/partner/dashboard'
      });
    }

    // Participant/User mode is always activated for everyone
    modes.push({
      id: UserRole.PARTICIPANT,
      label: 'User',
      role: UserRole.PARTICIPANT,
      desc: 'Sprints, Consistency & Reflections',
      icon: UserIcon,
      colorClass: activeRole === UserRole.PARTICIPANT 
        ? 'bg-orange-50 text-orange-600 border-orange-200 ring-2 ring-orange-500/20' 
        : 'bg-white text-gray-700 border-gray-100 hover:border-orange-100 hover:bg-orange-50/10',
      iconBgClass: activeRole === UserRole.PARTICIPANT
        ? 'bg-orange-500 text-white'
        : 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white',
      route: '/dashboard'
    });

    return modes;
  };

  const activatedModes = getActivatedModes();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            id="switch-mode-backdrop"
          />

          {/* Modal Content container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-sm bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-2xl flex flex-col z-10"
            id="switch-mode-content"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-base">🎛️</span>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  System Mode Changer
                </h4>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                id="switch-mode-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-5 px-1">
              <h3 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                Switch Active Mode
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                Select your perspective for this session
              </p>
            </div>

            {/* List of activated modes */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar py-1 px-0.5">
              {activatedModes.map((mode) => {
                const IconComponent = mode.icon;
                const isActive = activeRole === mode.role;

                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onSelectMode(mode.role, mode.route);
                      onClose();
                    }}
                    className={`group w-full flex items-center gap-4 p-4 rounded-3xl border text-left transition-all duration-300 active:scale-[0.98] ${mode.colorClass}`}
                    id={`mode-btn-${mode.id}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${mode.iconBgClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">
                          {mode.label} Mode
                        </span>
                        {isActive && (
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-100">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                        {mode.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer notice */}
            <div className="mt-5 text-center px-2">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                Toggle seamlessly between your spaces
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
