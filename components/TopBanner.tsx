import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import LocalLogo from './LocalLogo';

interface TopBannerProps {
  deferredPrompt: any;
}

const TopBanner: React.FC<TopBannerProps> = ({ deferredPrompt }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('vectorise_banner_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // For testing purposes, we'll allow it on desktop too, but keep the mobile check logic ready
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isDev = window.location.hostname.includes('run.app') || window.location.hostname.includes('localhost');

    // Hide if dismissed or already in the app (standalone)
    if (isDismissed || isStandalone) {
      setIsVisible(false);
    } else {
      // Show if mobile OR if we are in the dev environment so you can see it
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('vectorise_banner_dismissed', 'true');
    setIsVisible(false);
  };

  const handleAction = async () => {
    const isInstalled = localStorage.getItem('vec_pwa_installed') === 'true';

    if (deferredPrompt && !isInstalled) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('vec_pwa_installed', 'true');
        // Don't set vectorise_banner_dismissed here, so it can show "Open App" next time
        setIsVisible(false);
      }
    } else {
      // If already installed, we try to "open" it by navigating to the home page
      // In many mobile browsers, this will trigger the "Open in App" prompt or transition
      window.location.href = '/';
    }
  };

  if (!isVisible) return null;

  const isInstalled = localStorage.getItem('vec_pwa_installed') === 'true';

  return (
    <div 
      className="bg-[#159E6A] text-white py-3 px-4 flex items-center justify-between relative z-[100] border-b border-white/10 shadow-lg animate-fade-in cursor-pointer"
      onClick={handleAction}
    >
      <div className="flex-1 flex justify-center items-center gap-3">
        <div className="w-7 h-7 bg-white rounded-xl flex items-center justify-center shadow-sm">
           <LocalLogo type="favicon" className="w-5 h-5" />
        </div>
        <span className="text-white text-[13px] font-bold tracking-tight">
          {isInstalled ? 'Open Vectorise App' : 'Use the app for a smoother experience'}
        </span>
      </div>
      <button 
        onClick={handleDismiss}
        className="text-white/80 hover:text-white transition-colors p-1 ml-2"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default TopBanner;
