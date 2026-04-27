import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService } from '../services/pushNotificationService';
import { Bell, BellOff, Settings, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface PushToggleProps {
  className?: string;
  labelClassName?: string;
  showLabel?: boolean;
  showSubLabel?: boolean;
  label?: string;
  onToggleSuccess?: (newState: boolean) => void;
}

export const PushToggle: React.FC<PushToggleProps> = ({ 
  className = '', 
  labelClassName = 'text-sm font-bold text-gray-900',
  showLabel = true, 
  showSubLabel = true,
  label = 'Push Notifications',
  onToggleSuccess
}) => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const syncState = async () => {
    const status = await pushNotificationService.getPushStatus();
    setIsSubscribed(status.subscribed);
    setPermission(status.permission);
    setLoading(false);
  };

  useEffect(() => {
    syncState();
    
    // Listen for visibility changes to sync if user changed settings in browser
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncState();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleToggle = async () => {
    if (!user || toggling) return;
    setToggling(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        await pushNotificationService.unsubscribeUser(user.id);
        toast.success('Notifications disabled');
        if (onToggleSuccess) onToggleSuccess(false);
      } else {
        // Check for denied permission first
        if (permission === 'denied') {
          const isIframe = window.self !== window.top;
          const msg = isIframe 
            ? 'Settings are blocked in the preview. Please open in a new tab.'
            : 'Notifications are blocked. Please enable them in your browser settings.';
          toast.error(msg, { icon: <AlertCircle className="w-5 h-5" /> });
          return;
        }

        // Subscribe
        const toastId = toast.loading('Enabling notifications...');
        try {
          await pushNotificationService.subscribeUser(user.id);
          toast.success('Notifications enabled!', { id: toastId });
          if (onToggleSuccess) onToggleSuccess(true);
        } catch (err: any) {
          toast.error(err.message || 'Failed to enable notifications', { id: toastId });
        }
      }
      
      // Re-sync state
      await syncState();
    } catch (error) {
      console.error('[PushToggle] Toggle failed:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className={`w-10 h-6 bg-gray-100 rounded-full animate-pulse ${className}`} />
    );
  }

  const isDenied = permission === 'denied';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between group">
        {showLabel && (
          <div className="flex flex-col">
            <span className={`${labelClassName} flex items-center gap-2`}>
              {label}
              {isDenied && <AlertCircle className="w-4 h-4 text-red-500" />}
            </span>
            {showSubLabel && (
              <span className="text-[10px] text-gray-500 font-medium">
                {isDenied 
                  ? 'Check browser settings' 
                  : isSubscribed 
                  ? 'Reminders enabled' 
                  : 'Stay consistent with alerts'}
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleToggle}
          disabled={isDenied || toggling}
          className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            ${isSubscribed ? 'bg-green-600' : 'bg-gray-200'}
            ${(isDenied || toggling) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          `}
          role="switch"
          aria-checked={isSubscribed}
        >
          <span
            aria-hidden="true"
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
              ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {isDenied && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-bold text-red-700 leading-tight"> Notifications Blocked</p>
            <p className="text-[10px] text-red-600 mt-1 leading-relaxed">
              To re-enable, please click the lock icon in your browser address bar and set Notifications to "Allow".
            </p>
          </div>
        </div>
      )}
      
      {!isSubscribed && !isDenied && !loading && !pushNotificationService.isPWA() && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
          <Settings className="w-4 h-4 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-bold text-blue-700">Better on Mobile</p>
            <p className="text-[10px] text-blue-600 mt-1 leading-relaxed">
              Install the app (Add to Home Screen) for the most reliable reminders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
