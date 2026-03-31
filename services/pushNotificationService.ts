
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PushSubscriptionJSON } from '../types';

const VAPID_PUBLIC_KEY = 'BEl62vp97Wv9R_Y-v6_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w_7w'; // Placeholder, will be replaced or used from env

export const pushNotificationService = {
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
  }
};
