import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav: React.FC = () => {
    const navItems = [
        { path: '/dashboard', icon: '🏠', label: 'Home' },
        { path: '/discover', icon: '🔍', label: 'Discover' },
        { path: '/my-sprints', icon: '🏃', label: 'My Sprints' },
        { path: '/profile', icon: '👤', label: 'Profile' },
    ];

    return (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/80 backdrop-blur-md rounded-full border border-gray-100 shadow-lg z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center text-xs font-bold transition-all ` +
                            (isActive ? 'text-primary' : 'text-gray-400 hover:text-primary')
                        }
                    >
                        <span className="text-2xl">{item.icon}</span>
                        <span className="mt-1">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
