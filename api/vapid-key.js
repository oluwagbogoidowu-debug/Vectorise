import { VAPID_PUBLIC_KEY } from '../utils/webpush';

export default function handler(req, res) {
  res.status(200).json({
    publicKey: VAPID_PUBLIC_KEY.trim()
  });
}
