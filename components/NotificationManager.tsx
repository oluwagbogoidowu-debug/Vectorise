
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService } from '../services/pushNotificationService';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check } from 'lucide-react';

export const NotificationManager: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!user) return;

    // Check if we should show the prompt
    const checkPermission = async () => {
      if (!('Notification' in window)) return;

      if (Notification.permission === 'default') {
        // Wait a bit before showing the prompt
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    checkPermission();
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) return;
    setStatus('requesting');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await pushNotificationService.subscribeUser(user.id);
        setStatus('success');
        setTimeout(() => {
          setShowPrompt(false);
        }, 2000);
      } else {
        setStatus('error');
        setTimeout(() => {
          setShowPrompt(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Subscription failed:', err);
      setStatus('error');
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
            <h3 className="text-lg font-semibold text-gray-900">Stay on track</h3>
            <p className="text-sm text-gray-500 mt-1">
              Enable notifications to get daily task reminders and stay consistent with your growth.
            </p>
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
        
        {/* Progress bar for status */}
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
