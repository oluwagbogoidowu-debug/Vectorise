import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Zap, User, Settings, X, ChevronRight, Coins, TrendingUp, Award, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import LocalLogo from './LocalLogo';

interface ParticipantDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParticipantDrawerMenu: React.FC<ParticipantDrawerMenuProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (notifs) => {
      setHasUnread(notifs.some(n => !n.isRead));
    });
    return () => unsubscribe();
  }, [user]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navSections = [
    {
      title: 'My Journey',
      items: [
        { label: 'Your Next Sprint', path: '/participant/next-sprint', icon: Sparkles, badge: hasUnread ? 'New' : null },
        { label: 'Explore Sprints', path: '/explore', icon: Compass, badge: null },
        { label: 'My Sprints', path: '/my-sprints', icon: Zap, badge: null },
      ]
    },
    {
      title: 'Your Rise',
      items: [
        { label: 'My Rise', path: '/growth', icon: TrendingUp, badge: null },
        { label: 'Hall of Rise', path: '/profile/hall-of-rise', icon: Award, badge: null },
        { label: 'Impact', path: '/impact', icon: Target, badge: null },
      ]
    },
    {
      title: 'Account',
      items: [
        { label: 'Account Settings', path: '/profile/settings', icon: Settings, badge: null },
      ]
    }
  ];



  const walletBalance = (user as any)?.walletBalance ?? 50;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex">
          {/* Overlay - covers entire screen, exactly non-blurred and clickable to exit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 cursor-pointer"
            style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
          />

          {/* Drawer Menu - takes exactly 80% width of mobile screen (max 340px) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-[80vw] max-w-[340px] h-full bg-white dark:bg-[#18181b] shadow-2xl flex flex-col z-[251] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <LocalLogo type="green" className="h-9 sm:h-10 w-auto object-contain" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                title="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Details Summary */}
            {user && (
              <div className="px-6 py-4 bg-gray-50/70 dark:bg-[#222226] border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0E7850] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">
                      {user.name || 'Participant'}
                    </p>
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 px-2 py-1 rounded-lg shrink-0">
                  <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">{walletBalance}</span>
                </div>
              </div>
            )}

            {/* Navigation List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1.5">
                  <div className="px-3 pb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                      {section.title}
                    </span>
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-[#0E7850]/10 dark:bg-[#0E7850]/20 text-[#0E7850] dark:text-emerald-400 font-black shadow-xs'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:text-gray-950 dark:hover:text-white'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isActive ? 'bg-[#0E7850] text-white shadow-xs' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse">
                                {item.badge}
                              </span>
                            ) : (
                              <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#0E7850] dark:text-emerald-400' : 'text-gray-300 dark:text-zinc-600'}`} />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            {!user && (
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#18181b]">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/login');
                  }}
                  className="w-full py-3 bg-[#0E7850] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#085C3D] transition-colors cursor-pointer"
                >
                  Log In
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ParticipantDrawerMenu;
