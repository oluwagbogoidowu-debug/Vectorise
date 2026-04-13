import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from './vapid';

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'qP_xSYSgk0QqbBfgSqxuHsj3zeqWYnihR5ATHKtBw3Y';

webpush.setVapidDetails(
  'mailto:Vectorise.io@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default webpush;
