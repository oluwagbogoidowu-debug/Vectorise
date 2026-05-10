import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  const url = req.query.url as string;
  if (!url) return res.status(400).send('No URL provided');
  
  try {
    const response = await fetch(decodeURIComponent(url));
    if (!response.ok) throw new Error('Fetch failed');
    
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).send('Error proxying image');
  }
}
