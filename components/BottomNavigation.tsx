
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

const BottomNavigation: React.FC = () => {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(true); // Default true to match screenshot requirement

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (notifs) => {
      setHasUnread(notifs.some(n => !n.isRead));
    });
    return () => unsubscribe();
  }, [user]);

  const navItems = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: (active: boolean) => (
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {hasUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
          )}
        </div>
      )
    },
    {
      label: 'My Sprints',
      path: '/my-sprints',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012v2M7 7h10" />
        </svg>
      )
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] safe-area-pb">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full transition-all duration-300 ${
                isActive ? 'text-[#0E7850]' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="mb-1.5 transition-transform duration-300">
                  {item.icon(isActive)}
                </div>
                <span className={`text-[10px] font-black transition-colors duration-300 ${isActive ? 'text-[#0E7850]' : 'text-gray-400 opacity-60'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
