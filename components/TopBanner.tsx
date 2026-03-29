import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TopBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('vectorise_banner_dismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('vectorise_banner_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-[#050505] text-white py-2.5 px-4 flex items-center justify-between relative z-[100] border-b border-white/5">
      <div className="flex-1 flex justify-center">
        <button 
          onClick={() => {
            // In a real app, this might link to app store or trigger PWA install
            // For now, we'll just show the text as requested
          }}
          className="text-[#3897f0] text-[13px] font-bold hover:opacity-80 transition-opacity"
        >
          Use the app for a smoother experience
        </button>
      </div>
      <button 
        onClick={handleDismiss}
        className="text-white/60 hover:text-white transition-colors p-1"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default TopBanner;
