import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Check, CloudLightning } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { offlineSyncService } from '../services/offlineSyncService';

interface OfflineBannerProps {
  onSyncComplete?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showBanner, setShowBanner] = useState<boolean>(!navigator.onLine);
  const [justWentOnline, setJustWentOnline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustWentOnline(true);
      setShowBanner(true);

      // Attempt to sync offline queue!
      offlineSyncService.syncPendingCompletions(onSyncComplete);

      // Dismiss the "back online" banner after 3 seconds
      const timer = setTimeout(() => {
        setShowBanner(false);
        setJustWentOnline(false);
      }, 4000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustWentOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount: If we're online but have pending syncing, let's trigger it!
    if (navigator.onLine) {
      const pending = offlineSyncService.getPendingCompletions();
      if (pending.length > 0) {
        offlineSyncService.syncPendingCompletions(onSyncComplete);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onSyncComplete]);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center p-3 pointer-events-none"
        >
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full shadow-lg pointer-events-auto border backdrop-blur-md transition-colors duration-300 ${
            justWentOnline 
              ? 'bg-emerald-500/90 text-white border-emerald-400' 
              : 'bg-amber-600/90 text-white border-amber-500'
          }`}>
            {justWentOnline ? (
              <>
                <Wifi className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase">Back Online! Syncing tasks...</span>
                <span className="bg-white/20 p-0.5 rounded-full text-white">
                  <Check className="w-3 h-3" />
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 animate-bounce" />
                <span className="text-xs font-black tracking-wider uppercase">Offline Mode</span>
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                <span className="text-[10px] opacity-90 font-medium">Progress will save locally & sync later</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default OfflineBanner;
