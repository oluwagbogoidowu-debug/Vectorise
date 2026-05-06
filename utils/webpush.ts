import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from './vapid.js';

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hJ4w5pS8YyWlalmdtRjsZE8v9oPJLWTNeUSazpA-6bs';

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log('[WebPush] Using fallback VAPID keys. Ensure these match your client-side public key.');
} else {
  console.log('[WebPush] Using environment VAPID keys.');
}

console.log(`[WebPush] Public Key starts with: ${VAPID_PUBLIC_KEY.substring(0, 10)}...`);

webpush.setVapidDetails(
  'mailto:Vectorise.io@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default webpush;
