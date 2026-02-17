import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import LocalLogo from './LocalLogo';

interface PWAInstallPromptProps {
  deferredPrompt: any;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ deferredPrompt }) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkCriteria = async () => {
      // 1. Basic checks
      if (!user || !deferredPrompt) return;
      if (localStorage.getItem('vec_pwa_installed') === 'true') return;

      // 2. Mobile Browser check
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) return;

      // 3. Session time check (> 60s)
      if (sessionTime < 60) return;

      // 4. Persistence / Dismissal check
      const dismissCount = parseInt(localStorage.getItem('vec_pwa_dismiss_count') || '0');
      const lastDismiss = localStorage.getItem('vec_pwa_last_dismiss');
      
      if (dismissCount >= 2) {
        if (lastDismiss) {
          const lastDate = new Date(lastDismiss).getTime();
          const fourteenDays = 14 * 24 * 60 * 60 * 1000;
          if (Date.now() - lastDate < fourteenDays) return;
        }
      }

      // 5. Sprint action / Day 1 check
      const enrollments = await sprintService.getUserEnrollments(user.id);
      const hasAction = enrollments.some(e => e.progress && e.progress.some(p => p.completed));
      
      if (!hasAction) return;

      // 6. Timing delay (3-8 seconds)
      const randomDelay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
      
      setTimeout(() => {
        // Double check session visibility and one-per-session rule
        if (!sessionStorage.getItem('vec_pwa_prompted_this_session')) {
          setIsVisible(true);
          sessionStorage.setItem('vec_pwa_prompted_this_session', 'true');
        }
      }, randomDelay);
    };

    if (!isVisible) checkCriteria();
  }, [user, deferredPrompt, sessionTime, isVisible]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('vec_pwa_installed', 'true');
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    const currentCount = parseInt(localStorage.getItem('vec_pwa_dismiss_count') || '0');
    localStorage.setItem('vec_pwa_dismiss_count', (currentCount + 1).toString());
    localStorage.setItem('vec_pwa_last_dismiss', new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[2.5rem] rounded-b-[1rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col p-8 pb-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center shadow-inner">
            <LocalLogo type="favicon" className="w-10 h-10" />
          </div>
        </div>

        <div className="text-center space-y-3 mb-10">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">
            Don’t break your momentum
          </h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed italic px-4">
            Install Vectorise to keep your daily progress one tap away.
          </p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleInstall}
            className="w-full py-4.5 bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            Install App
          </button>
          <button 
            onClick={handleDismiss}
            className="w-full py-4 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-gray-600 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default PWAInstallPrompt;