
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { Sparkles, Compass, Zap, SlidersHorizontal, BookOpen } from 'lucide-react';
import { SwitchModeModal } from './SwitchModeModal';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

const BottomNavigation: React.FC = () => {
  const { user, activeRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);
  const [isSwitchModeOpen, setIsSwitchModeOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (notifs) => {
      setHasUnread(notifs.some(n => !n.isRead));
    });
    return () => unsubscribe();
  }, [user]);

  const leftNavItems = [
    {
      label: 'Explore',
      path: '/explore',
      icon: (active: boolean) => (
        <Compass className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
      )
    },
    {
      label: 'Next Sprint',
      path: '/participant/next-sprint',
      icon: (active: boolean) => (
        <div className="relative">
          <Sparkles className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
          {hasUnread && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <div className="absolute w-4 h-4 bg-red-500/20 rounded-full animate-pulse"></div>
              <div className="relative w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
            </div>
          )}
        </div>
      )
    }
  ];

  const rightNavItems = [
    {
      label: 'My Sprints',
      path: '/my-sprints',
      icon: (active: boolean) => (
        <Zap className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
      )
    },
    {
      label: 'RiseBlog',
      path: '/riseblog',
      icon: (active: boolean) => (
        <BookOpen className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
      )
    }
  ];

  const handleOpenSwitchMode = () => {
    triggerHaptic(hapticPatterns.light);
    setIsSwitchModeOpen(true);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] safe-area-pb">
        <div className="flex justify-between items-center h-16 max-w-lg mx-auto px-4 relative">
          {/* Left items */}
          <div className="flex items-center justify-around flex-1">
            {leftNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-16 transition-all duration-300 ${
                    isActive ? 'text-[#0E7850]' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="mb-0.5 transition-transform duration-300">
                      {item.icon(isActive)}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-[#0E7850] font-bold' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Elevated Center Switch Mode Button */}
          <div className="relative flex flex-col items-center justify-center px-3">
            <button
              type="button"
              onClick={handleOpenSwitchMode}
              aria-label="Switch Mode"
              title="Switch Mode"
              className="relative -top-5 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0E7850] text-white shadow-xl shadow-[#0E7850]/30 border-4 border-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-90 hover:shadow-2xl hover:shadow-[#0E7850]/40 cursor-pointer group"
            >
              <div className="w-7 h-7 flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
                <SlidersHorizontal className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
            </button>
            <span className="-mt-3.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              Mode
            </span>
          </div>

          {/* Right items */}
          <div className="flex items-center justify-around flex-1">
            {rightNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-16 transition-all duration-300 ${
                    isActive ? 'text-[#0E7850]' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="mb-0.5 transition-transform duration-300">
                      {item.icon(isActive)}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-[#0E7850] font-bold' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Switch Mode Modal */}
      {user && (
        <SwitchModeModal
          isOpen={isSwitchModeOpen}
          onClose={() => setIsSwitchModeOpen(false)}
          user={user}
          activeRole={activeRole}
          onSelectMode={(role, route) => {
            switchRole(role);
            navigate(route);
          }}
        />
      )}
    </>
  );
};

export default BottomNavigation;
