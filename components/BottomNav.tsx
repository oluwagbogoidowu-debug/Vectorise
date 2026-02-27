import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutList, User } from 'lucide-react';

const BottomNav: React.FC = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: Home, label: 'Home', notification: true },
        { path: '/my-sprints', icon: LayoutList, label: 'My Sprints' },
        { path: '/profile', icon: User, label: 'Profile' },
    ];

    return (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xs bg-white rounded-full border border-gray-100 shadow-lg z-50 transition-all duration-300 ease-out transform hover:scale-105">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`relative flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-200 ` +
                                (isActive ? 'text-primary' : 'text-gray-400 hover:text-primary')}
                        >
                            <Icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-primary' : 'stroke-gray-300 group-hover:stroke-primary'}`} strokeWidth={2.5} />
                            {item.label}
                            {item.notification && isActive && (
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
