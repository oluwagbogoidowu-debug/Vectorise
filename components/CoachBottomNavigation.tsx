
import React from 'react';
import { NavLink } from 'react-router-dom';

const CoachBottomNavigation: React.FC = () => {
  const navItems = [
    {
      label: 'Home',
      path: '/coach/dashboard',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2' : 'stroke-1.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      label: 'Sprints',
      path: '/coach/sprints',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2' : 'stroke-1.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      label: 'Participants',
      path: '/coach/participants',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2' : 'stroke-1.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      label: 'Shine',
      path: '/coach/shine',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2 text-yellow-500' : 'stroke-1.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
        label: 'Earnings',
        path: '/coach/earnings',
        icon: (active: boolean) => (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2' : 'stroke-1.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
    {
      label: 'Profile',
      path: '/coach/profile',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'stroke-2' : 'stroke-1.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
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
  );
};

export default CoachBottomNavigation;
