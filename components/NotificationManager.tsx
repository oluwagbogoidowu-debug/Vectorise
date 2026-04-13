import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService } from '../services/pushNotificationService';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check } from 'lucide-react';

type Status = 'idle' | 'requesting' | 'success' | 'error' | 'denied';

export const NotificationManager: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let timer: any;

    const init = async () => {
      // Full capability check
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        return;
      }

      // If already denied → don't show prompt
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();

        if (existingSub) {
          return; // already subscribed → no prompt
        }
      } catch (err) {
        console.error('Subscription check failed:', err);
      }

      // Only show if permission not yet granted
      if (Notification.permission === 'default') {
        timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    };

    init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) return;

    setStatus('requesting');

    try {
      // The service now handles permission request, VAPID key fetching, and subscription
      await pushNotificationService.subscribeUser(user.id);

      setStatus('success');

      // prevent future prompts
      localStorage.setItem('push_enabled', 'true');

      setTimeout(() => {
        setShowPrompt(false);
      }, 2000);
    } catch (err: any) {
      console.error('Subscription failed:', err);
      setStatus('error');
      // Use the error message from the service if available
      setErrorMessage(err.message || 'Something went wrong. Please try opening in a new tab.');
      
      if (err.message?.includes('permission') || err.message?.includes('blocked')) {
        setStatus('denied');
      }
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-50 rounded-xl text-green-600">
            <Bell className="w-6 h-6" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Stay on track
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Enable notifications to get reminders and stay consistent.
            </p>

            {status === 'denied' || status === 'error' ? (
              <p className="text-xs text-red-500 mt-3 font-medium">
                {errorMessage || 'Notifications blocked or preview restricted. Please enable them in browser settings or open in a new tab.'}
              </p>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSubscribe}
                disabled={status === 'requesting'}
                className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'requesting' ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : status === 'success' ? (
                  <>
                    <Check className="w-5 h-5" />
                    Enabled
                  </>
                ) : (
                  'Enable Notifications'
                )}
              </button>

              <button
                onClick={() => setShowPrompt(false)}
                className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {status === 'requesting' && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            className="absolute bottom-0 left-0 h-1 bg-green-600"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
