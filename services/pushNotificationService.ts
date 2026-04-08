
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PushSubscriptionJSON, Participant } from '../types';

const VAPID_PUBLIC_KEY = 'BEl62vp97Wv9R_Y-v6_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w'; // Placeholder, will be replaced or used from env

export const pushNotificationService = {
  /**
   * Check if we should show the push notification permission request.
   */
  shouldShowPermissionRequest: (user: Participant) => {
    // If already subscribed or explicitly disabled, don't show
    if (user.pushSubscription || user.notificationsDisabled) return false;

    const now = new Date();
    const lastRequestAt = user.pushPermissionLastRequestAt ? new Date(user.pushPermissionLastRequestAt) : null;
    const lastDeniedAt = user.pushPermissionLastDeniedAt ? new Date(user.pushPermissionLastDeniedAt) : null;
    const lastActivityAt = user.lastActivityAt ? new Date(user.lastActivityAt) : null;
    
    // If never requested, show it (caller will decide when, e.g., after first submission)
    if (!lastRequestAt) return true;

    // Check for "4 times and 4 days in a row" rule
    const consecutiveDenied = user.pushPermissionConsecutiveDeniedDays || 0;
    
    if (consecutiveDenied >= 4) {
      // Cooldown logic
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Wait for a week later
      if (lastDeniedAt && lastDeniedAt > oneWeekAgo) {
        // Check if they missed 3-5 days
        if (lastActivityAt) {
          const daysSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity >= 3) return true;
        }
        return false;
      }
    }

    // If they ignored/dismissed, show again in the next action (caller handles the "next action" part)
    // We just need to ensure we don't spam them in the same session or too frequently
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (lastRequestAt > oneHourAgo) return false;

    return true;
  },

  /**
   * Record the user's response to the permission request.
   */
  recordPermissionResponse: async (userId: string, user: Participant, response: 'accepted' | 'denied' | 'ignored') => {
    const userRef = doc(db, 'users', userId);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const updates: any = {
      pushPermissionLastRequestAt: now.toISOString()
    };

    if (response === 'accepted') {
      // Handled by subscribeUser
    } else if (response === 'denied') {
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
      // Ignored - just update last request time
      // Reset consecutive if they didn't deny today
      const lastDeniedAt = user.pushPermissionLastDeniedAt ? new Date(user.pushPermissionLastDeniedAt) : null;
      const lastDeniedDate = lastDeniedAt ? lastDeniedAt.toISOString().split('T')[0] : null;
      if (lastDeniedDate !== today) {
        updates.pushPermissionConsecutiveDeniedDays = 0;
      }
    }

    await updateDoc(userRef, updates);
  },

  /**
   * Request permission for push notifications and subscribe the user.
   */
  subscribeUser: async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by this browser');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Explicitly request permission first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Get VAPID public key from server or use placeholder
        const response = await fetch('/api/notifications/vapid-key');
        const { publicKey } = await response.json();
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });
      }

      const subscriptionJSON = subscription.toJSON() as unknown as PushSubscriptionJSON;
      
      // Save subscription to Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushSubscription: subscriptionJSON,
        notificationsDisabled: false
      });

      return subscriptionJSON;
    } catch (error) {
      console.error('Failed to subscribe user to push notifications:', error);
      throw error;
    }
  },

  /**
   * Unsubscribe the user from push notifications.
   */
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
      console.error('Failed to unsubscribe user from push notifications:', error);
      throw error;
    }
  },

  /**
   * Update user activity timestamp and notification state.
   */
  updateActivity: async (userId: string, state: string = 'Active') => {
    try {
      await fetch('/api/notifications/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, state })
      });
    } catch (error) {
      console.error('Failed to update user activity:', error);
    }
  },

  /**
   * Trigger the "Completed Task" notification.
   */
  triggerCompletedTask: async (userId: string) => {
    try {
      await fetch('/api/notifications/trigger-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Failed to trigger completed task notification:', error);
    }
  },
  
  /**
   * Send a generic push notification via server.
   */
  sendPush: async (userId: string, title: string, body: string, url?: string, tag?: string) => {
    try {
      await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, body, url, tag })
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }
};
