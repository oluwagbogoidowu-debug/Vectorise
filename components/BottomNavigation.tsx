
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { Home, Package, User } from 'lucide-react';

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
          <Home className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
          {hasUnread && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <div className="absolute w-4 h-4 bg-red-500/20 rounded-full animate-pulse"></div>
              <div className="relative w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
            </div>
          )}
        </div>
      )
    },
    {
      label: 'My Sprints',
      path: '/my-sprints',
      icon: (active: boolean) => (
        <Package className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
      )
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: (active: boolean) => (
        <User className={`h-6 w-6 ${active ? 'text-[#0E7850]' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] safe-area-pb">
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
                <div className="mb-1 transition-transform duration-300">
                  {item.icon(isActive)}
                </div>
                <span className={`text-[11px] font-medium transition-colors duration-300 ${isActive ? 'text-[#0E7850]' : 'text-gray-400'}`}>
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
