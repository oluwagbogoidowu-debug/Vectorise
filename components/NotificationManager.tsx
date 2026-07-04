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
      const participant = user as any;
      if (participant?.fcmToken) {
        return; // already subscribed -> no prompt
      }

      // Full capability check
      if (
        !('serviceWorker' in navigator) ||
        !('Notification' in window)
      ) {
        return;
      }

      // If already denied → don't show prompt
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }

      // Only show if permission not yet granted
      if (Notification.permission === 'default') {
        timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      } else if (Notification.permission === 'granted' && !participant?.fcmToken) {
        // Silently register the device token
        pushNotificationService.subscribeUser(user.id).catch(err => {
          console.warn('Silent FCM registration failed:', err);
        });
      }
    };

    init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  useEffect(() => {
    const handleTrigger = () => {
      setShowPrompt(true);
    };
    window.addEventListener('trigger_push_prompt', handleTrigger);
    
    // Check if the trigger flag is set in localStorage on mount
    if (localStorage.getItem('trigger_push_prompt_small') === 'true') {
      localStorage.removeItem('trigger_push_prompt_small');
      handleTrigger();
    }

    return () => {
      window.removeEventListener('trigger_push_prompt', handleTrigger);
    };
  }, []);

  const handleSubscribe = async () => {
    if (!user) return;

    setStatus('requesting');

    try {
      // The service now handles permission request, VAPID key fetching, and subscription
      await pushNotificationService.subscribeUser(user.id);

      setStatus('success');

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

  return null;
};
