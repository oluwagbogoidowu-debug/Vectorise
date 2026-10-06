import React, { useEffect } from 'react';
import Header from './Header';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';
  const showHeader = isHomePage || isDashboard;

  useEffect(() => {
    if (localStorage.getItem('show_bonus_toast') === 'true') {
      localStorage.removeItem('show_bonus_toast');
      const timer = setTimeout(() => {
        toast.success("10 coin bonus claimed and first step completed successfully! 🪙", {
          duration: 5000,
        });
        
        const pushTimer = setTimeout(() => {
          localStorage.setItem('trigger_push_prompt_small', 'true');
          window.dispatchEvent(new Event('trigger_push_prompt'));
        }, 2000);
        
        return () => clearTimeout(pushTimer);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const isDaySuccess = location.pathname.startsWith('/participant/day-success');
  const isSprintView = location.pathname.startsWith('/participant/sprint');
  const isSettingsPage = location.pathname.startsWith('/profile/settings');
  const isActiveSprint = location.pathname.startsWith('/participant/active-sprint');
  const isNextSprint = location.pathname.startsWith('/participant/next-sprint') || location.pathname.startsWith('/participant/recommendation') || location.pathname === '/dashboard';
  const isFullBleedPage = isDaySuccess || isSprintView || isSettingsPage || isActiveSprint || isNextSprint || location.pathname.startsWith('/sprint') || location.pathname.startsWith('/coach/sprint/preview');

  return (
    <div className="h-[100dvh] w-full bg-light dark:bg-[#121212] overflow-hidden flex flex-col">
      {/* Main content area: overflow-y-auto enables scrolling for the whole view */}
      {showHeader && <Header />}
      <main className={`flex-1 bg-light dark:bg-[#121212] relative overflow-y-auto custom-scrollbar ${showHeader ? 'pt-2' : ''} ${isFullBleedPage ? 'pb-0' : 'pb-8'}`}>
        {children || <Outlet />}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ParticipantLayout;
