import { VAPID_PUBLIC_KEY } from '../../utils/vapid';

export default function handler(req: any, res: any) {
  try {
    if (!VAPID_PUBLIC_KEY) {
      return res.status(500).json({ error: 'VAPID key missing' });
    }

    return res.status(200).json({
      publicKey: VAPID_PUBLIC_KEY
    });
  } catch (error) {
    console.error('VAPID API error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
