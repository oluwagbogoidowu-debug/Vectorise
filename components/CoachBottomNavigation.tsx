
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SwitchModeModal } from './SwitchModeModal';
import { SlidersHorizontal } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

const CoachBottomNavigation: React.FC = () => {
  const { user, activeRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isSwitchModeOpen, setIsSwitchModeOpen] = useState(false);

  const leftNavItems = [
    {
      label: 'Home',
      path: '/coach/dashboard',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2 text-primary' : 'stroke-1.5 text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      label: 'Sprints',
      path: '/coach/sprints',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2 text-primary' : 'stroke-1.5 text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012v2M7 7h10" />
        </svg>
      )
    }
  ];

  const rightNavItems = [
    {
      label: 'Participants',
      path: '/coach/participants',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2 text-primary' : 'stroke-1.5 text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      label: 'Earnings',
      path: '/coach/earnings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2 text-primary' : 'stroke-1.5 text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const handleOpenSwitchMode = () => {
    triggerHaptic(hapticPatterns.light);
    setIsSwitchModeOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] safe-area-pb">
        <div className="flex justify-between items-center h-16 max-w-lg mx-auto px-4 relative">
          {/* Left Items */}
          <div className="flex items-center justify-around flex-1">
            {leftNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors duration-200 ${
                    isActive ? 'text-primary font-bold' : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    <span className="text-[9px] md:text-[10px] font-medium tracking-wide">{item.label}</span>
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
              className="relative -top-5 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-white shadow-xl shadow-primary/30 border-4 border-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-90 hover:shadow-2xl hover:shadow-primary/40 cursor-pointer group"
            >
              <div className="w-7 h-7 flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
                <SlidersHorizontal className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
            </button>
            <span className="-mt-3.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              Mode
            </span>
          </div>

          {/* Right Items */}
          <div className="flex items-center justify-around flex-1">
            {rightNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors duration-200 ${
                    isActive ? 'text-primary font-bold' : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    <span className="text-[9px] md:text-[10px] font-medium tracking-wide">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

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

export default CoachBottomNavigation;
