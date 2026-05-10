import { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const [sprintsSnap, tracksSnap] = await Promise.all([
      db.collection('sprints').where('published', '==', true).get(),
      db.collection('tracks').where('published', '==', true).get()
    ]);

    const hostname = 'https://vectorise.online';

    const staticPaths = [
      '/home',
      '/discover',
      '/explore',
      '/partner',
      '/login',
      '/signup'
    ];

    const sprintPaths = sprintsSnap.docs.map(doc => `/sprint/${doc.id}`);
    const trackPaths = tracksSnap.docs.map(doc => `/track/${doc.id}`);

    const urls = [...staticPaths, ...sprintPaths, ...trackPaths];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${hostname}${url.replace(/&/g, '&amp;')}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url === '/home' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === '/home' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}
