import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PushSubscriptionJSON, Participant } from '../types';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error('Failed to decode base64 string:', base64String);
    throw new Error('Invalid VAPID public key format');
  }
}

export const pushNotificationService = {
  shouldShowPermissionRequest: (user: Participant) => {
    if (user.pushSubscription || user.notificationsDisabled) return false;

    const now = new Date();
    const lastRequestAt = user.pushPermissionLastRequestAt ? new Date(user.pushPermissionLastRequestAt) : null;
    const lastDeniedAt = user.pushPermissionLastDeniedAt ? new Date(user.pushPermissionLastDeniedAt) : null;
    const lastActivityAt = user.lastActivityAt ? new Date(user.lastActivityAt) : null;

    if (!lastRequestAt) return true;

    const consecutiveDenied = user.pushPermissionConsecutiveDeniedDays || 0;

    if (consecutiveDenied >= 4) {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (lastDeniedAt && lastDeniedAt > oneWeekAgo) {
        if (lastActivityAt) {
          const daysSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity >= 3) return true;
        }
        return false;
      }
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (lastRequestAt > oneHourAgo) return false;

    return true;
  },

  recordPermissionResponse: async (userId: string, user: Participant, response: 'accepted' | 'denied' | 'ignored') => {
    const userRef = doc(db, 'users', userId);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const updates: any = {
      pushPermissionLastRequestAt: now.toISOString()
    };

    if (response === 'denied') {
      const lastDeniedAt = user.pushPermissionLastDeniedAt ? new Date(user.pushPermissionLastDeniedAt) : null;
      const lastDeniedDate = lastDeniedAt ? lastDeniedAt.toISOString().split('T')[0] : null;
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let newConsecutive = 1;
      if (lastDeniedDate === yesterday) {
        newConsecutive = (user.pushPermissionConsecutiveDeniedDays || 0) + 1;
      } else if (lastDeniedDate === today) {
        newConsecutive = user.pushPermissionConsecutiveDeniedDays || 1;
      }

      updates.pushPermissionDeniedCount = (user.pushPermissionDeniedCount || 0) + 1;
      updates.pushPermissionLastDeniedAt = now.toISOString();
      updates.pushPermissionConsecutiveDeniedDays = newConsecutive;
    } else {
      const lastDeniedAt = user.pushPermissionLastDeniedAt ? new Date(user.pushPermissionLastDeniedAt) : null;
      const lastDeniedDate = lastDeniedAt ? lastDeniedAt.toISOString().split('T')[0] : null;
      if (lastDeniedDate !== today) {
        updates.pushPermissionConsecutiveDeniedDays = 0;
      }
    }

    await updateDoc(userRef, updates);
  },

  getPushStatus: async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return { supported: false, permission: 'denied', subscribed: false };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return {
        supported: true,
        permission: Notification.permission,
        subscribed: !!subscription,
      };
    } catch (err) {
      console.error('[PushService] Error checking status:', err);
      return {
        supported: true,
        permission: Notification.permission,
        subscribed: false,
      };
    }
  },

  isPWA: () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (navigator as any).standalone || 
           document.referrer.includes('android-app://');
  },

  subscribeUser: async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported by this browser');
    }

    try {
      // 1. Ensure service worker is registered and ready
      console.log('[PushService] Waiting for Service Worker to be ready...');
      
      // Register first to be sure
      await navigator.serviceWorker.register('/sw.js');
      
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker readiness timed out')), 10000))
      ]) as ServiceWorkerRegistration;

      // 2. Critical: Ensure there is an active worker before subscribing
      if (!registration.active) {
        console.log('[PushService] SW ready but not active. Waiting for activation...');
        const worker = registration.installing || registration.waiting;
        if (worker) {
          await new Promise<void>((resolve) => {
            worker.addEventListener('statechange', (e: any) => {
              if (e.target.state === 'active') {
                console.log('[PushService] SW activated via statechange');
                resolve();
              }
            });
            // Safety timeout for statechange
            setTimeout(resolve, 5000);
          });
        }
      }

      // Final check
      if (!registration.active) {
        throw new Error('Service Worker could not be activated. Please refresh the page.');
      }

      console.log('[PushService] Service Worker is active. Proceeding with subscription.');

      if (!('Notification' in window)) {
        throw new Error('Notification API not available in this browser.');
      }

      if (Notification.permission === 'denied') {
        const isIframe = window.self !== window.top;
        const guidance = isIframe 
          ? ' Since you are in a preview window, please open the app in a new tab to enable notifications.' 
          : ' Please enable notifications in your browser settings (usually by clicking the lock icon in the address bar).';
        throw new Error(`Notification permission is blocked.${guidance}`);
      }

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        const isIframe = window.self !== window.top;
        if (isIframe) {
          throw new Error('Notification permission denied. Browsers often block these requests in embedded previews. Please open the app in a new tab to enable notifications.');
        }
        throw new Error('Notification permission denied.');
      }

      let subscription = await registration.pushManager.getSubscription();

      const response = await fetch(`${window.location.origin}/api/vapid-key`);
      if (!response.ok) throw new Error('Failed to fetch VAPID key');
      const { publicKey } = await response.json();
      const applicationServerKey = urlBase64ToUint8Array(publicKey.trim());

      if (subscription) {
        // Check if the current subscription uses the same key
        const currentKey = subscription.options.applicationServerKey;
        if (currentKey) {
          const currentKeyArray = new Uint8Array(currentKey);
          const isSameKey = currentKeyArray.length === applicationServerKey.length &&
            currentKeyArray.every((v, i) => v === applicationServerKey[i]);
          
          if (!isSameKey) {
            console.log('VAPID key changed, re-subscribing...');
            await subscription.unsubscribe();
            subscription = null;
          }
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      if (!subscription) throw new Error('Failed to create push subscription');

      // ✅ FIXED: Safe subscription extraction
      const rawSub = subscription.toJSON();

      const subscriptionJSON: PushSubscriptionJSON = {
        endpoint: subscription.endpoint,
        expirationTime: rawSub.expirationTime || null,
        keys: {
          p256dh: rawSub.keys?.p256dh || '',
          auth: rawSub.keys?.auth || ''
        }
      };

      // ✅ SAFETY CHECK
      if (!subscriptionJSON.keys.p256dh || !subscriptionJSON.keys.auth) {
        console.error('Invalid subscription keys:', subscriptionJSON);
        throw new Error('Invalid subscription keys generated');
      }

      // ✅ FIXED: absolute URL
      const responseSub = await fetch(`${window.location.origin}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: subscriptionJSON })
      });

      if (!responseSub.ok) {
        const errorData = await responseSub.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${responseSub.status}`);
      }

      return subscriptionJSON;
    } catch (error: any) {
      console.error('Push subscription process failed:', error);
      throw error;
    }
  },

  unsubscribeUser: async (userId: string) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushSubscription: null,
        notificationsDisabled: true
      });
    } catch (error) {
      console.error('Failed to unsubscribe user:', error);
      throw error;
    }
  },

  updateActivity: async (userId: string, state: string = 'Active') => {
    try {
      await fetch(`${window.location.origin}/api/notifications/update-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, state })
      });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  },

  triggerCompletedTask: async (userId: string) => {
    try {
      await fetch(`${window.location.origin}/api/notifications/trigger-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Failed to trigger notification:', error);
    }
  },
  
  triggerUpdate: async (userId: string) => {
    try {
      await fetch(`${window.location.origin}/api/notifications/trigger-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Failed to trigger notification:', error);
    }
  },

  sendPush: async (userId: string, title: string, body: string, url?: string, tag?: string, bypassActiveCheck: boolean = false) => {
    try {
      await fetch(`${window.location.origin}/api/notifications/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, body, url, tag, bypassActiveCheck })
      });
    } catch (error) {
      console.error('Failed to send push:', error);
    }
  }
};
