import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutList, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SwitchModeModal, hasMultipleModes } from './SwitchModeModal';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

const BottomNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, activeRole, switchRole } = useAuth();
    const [isSwitchModeOpen, setIsSwitchModeOpen] = useState(false);
    const showModeChanger = hasMultipleModes(user);

    const handleOpenSwitchMode = () => {
        triggerHaptic(hapticPatterns.light);
        setIsSwitchModeOpen(true);
    };

    return (
        <>
            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-full border border-gray-100 shadow-xl z-50 transition-all duration-300">
                <div className={`flex items-center h-16 px-6 relative ${showModeChanger ? 'justify-between' : 'justify-around'}`}>
                    <NavLink
                        to="/"
                        className={`relative flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                            location.pathname === '/' ? 'text-primary' : 'text-gray-400 hover:text-primary'
                        }`}
                    >
                        <Home className={`w-6 h-6 mb-1 ${location.pathname === '/' ? 'stroke-primary' : 'stroke-gray-400'}`} strokeWidth={2.5} />
                        Home
                    </NavLink>

                    {/* Elevated Center Switch Mode Button & Label (Only shown if at least 2 modes of existence) */}
                    {showModeChanger && (
                        <div className="relative flex flex-col items-center justify-center">
                            <button
                                type="button"
                                onClick={handleOpenSwitchMode}
                                aria-label="Switch Mode"
                                title="Switch Mode"
                                className="relative -top-5 w-14 h-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30 border-4 border-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-90 cursor-pointer group"
                            >
                                <div className="w-7 h-7 flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
                                    <SlidersHorizontal className="w-6 h-6 text-white stroke-[2.5]" />
                                </div>
                            </button>
                            <span className="-mt-3.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                Mode
                            </span>
                        </div>
                    )}

                    <NavLink
                        to="/my-sprints"
                        className={`relative flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                            location.pathname === '/my-sprints' ? 'text-primary' : 'text-gray-400 hover:text-primary'
                        }`}
                    >
                        <LayoutList className={`w-6 h-6 mb-1 ${location.pathname === '/my-sprints' ? 'stroke-primary' : 'stroke-gray-400'}`} strokeWidth={2.5} />
                        My Sprints
                    </NavLink>
                </div>
            </nav>

            {user && showModeChanger && (
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

export default BottomNav;
