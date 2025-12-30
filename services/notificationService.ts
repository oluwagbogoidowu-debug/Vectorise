import { Notification } from '../types';

const NOTIFICATIONS_KEY = 'shine-notifications';

const getNotifications = (): Notification[] => {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const notificationService = {
  addNotification: (text: string): Notification => {
    const notifications = getNotifications();
    const newNotification: Notification = {
      id: new Date().toISOString(),
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updatedNotifications = [newNotification, ...notifications];
    saveNotifications(updatedNotifications);
    return newNotification;
  },

  getNotifications: (): Notification[] => {
    return getNotifications();
  },

  markAsRead: (id: string): Notification[] => {
    let notifications = getNotifications();
    notifications = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(notifications);
    return notifications;
  },

  markAllAsRead: (): Notification[] => {
    let notifications = getNotifications();
    notifications = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(notifications);
    return notifications;
  },
};