import webpush from 'web-push';

/**
 * Initialize and return a configured webpush instance
 * This avoids crashes during import and ensures safe usage
 */
export function getWebPush() {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('Missing VAPID keys in environment variables');
  }

  webpush.setVapidDetails(
    'mailto:vectorise.io@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  return webpush;
}
