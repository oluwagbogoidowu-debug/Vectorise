import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from './vapid.js';

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hJ4w5pS8YyWlalmdtRjsZE8v9oPJLWTNeUSazpA-6bs';

webpush.setVapidDetails(
  'mailto:Vectorise.io@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default webpush;
