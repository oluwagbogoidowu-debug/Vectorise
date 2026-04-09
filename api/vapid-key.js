export default function handler(req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || 'BHPoCpbFGBbD4uJ1SxIqVLg0Z1bGOKu_Z6huSrBlI7Z_c3MhvGI_BzaucmyeVRvUv0IBV2vWY_m5wkGSwFZn6ZY';
  res.status(200).json({
    publicKey: publicKey.trim()
  });
}
