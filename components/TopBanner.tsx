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
    const isInstalled = localStorage.getItem('vec_pwa_installed') === 'true';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Show if not dismissed, not installed, and is mobile
    if (!isDismissed && !isInstalled && isMobile) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('vectorise_banner_dismissed', 'true');
    setIsVisible(false);
  };

  const handleAction = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('vectorise_banner_dismissed', 'true');
        setIsVisible(false);
      }
    } else {
      // If already installed or not supported, we can't easily "open" it via JS
      // but we can show a toast or just let the browser handle it.
      // For now, we'll just log it.
      console.log('App might already be installed or PWA not supported');
    }
  };

  if (!isVisible) return null;

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
          Use the app for a smoother experience
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
