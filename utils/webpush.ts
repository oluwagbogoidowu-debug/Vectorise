import webpush from 'web-push';

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPG4lkECd-HiF4W8WPANEjk6QswjHOFk4fnvdTceYYu_L4ORxw7PogMDAqANoL1DnPM0L27zEpqM6Zokn7ZJhdc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'qP_xSYSgk0QqbBfgSqxuHsj3zeqWYnihR5ATHKtBw3Y';

webpush.setVapidDetails(
  'mailto:Vectorise.io@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default webpush;
