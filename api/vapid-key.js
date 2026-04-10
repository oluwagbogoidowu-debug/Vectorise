export default function handler(req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || 'BPG4lkECd-HiF4W8WPANEjk6QswjHOFk4fnvdTceYYu_L4ORxw7PogMDAqANoL1DnPM0L27zEpqM6Zokn7ZJhdc';
  res.status(200).json({
    publicKey: publicKey.trim()
  });
}
