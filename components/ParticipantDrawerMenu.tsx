import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Zap, User, Settings, LogOut, X, ChevronRight, Coins } from 'lucide-react';
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

  const navItems = [
    {
      label: 'Explore Sprints',
      path: '/explore',
      icon: Compass,
      badge: null
    },
    {
      label: 'Your Next Sprint',
      path: '/participant/next-sprint',
      icon: Sparkles,
      badge: hasUnread ? 'New' : null
    },
    {
      label: 'My Sprints',
      path: '/my-sprints',
      icon: Zap,
      badge: null
    },
    {
      label: 'Profile & Growth',
      path: '/profile',
      icon: User,
      badge: null
    },
    {
      label: 'Account Settings',
      path: '/profile/settings',
      icon: Settings,
      badge: null
    }
  ];

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

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
            className="relative w-[80vw] max-w-[340px] h-full bg-white shadow-2xl flex flex-col z-[251] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <LocalLogo type="green" className="h-9 sm:h-10 w-auto object-contain" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                title="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Details Summary */}
            {user && (
              <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0E7850] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">
                      {user.name || 'Participant'}
                    </p>
                    <p className="text-[10px] font-semibold text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-lg shrink-0">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-black text-amber-700">{walletBalance}</span>
                </div>
              </div>
            )}

            {/* Navigation List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
              <div className="px-3 pb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Navigation
                </span>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#0E7850]/10 text-[#0E7850] font-black shadow-xs'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isActive ? 'bg-[#0E7850] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
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
                          <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#0E7850]' : 'text-gray-300'}`} />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-white">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
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
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ParticipantDrawerMenu;
