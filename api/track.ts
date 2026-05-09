import { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const trackId = req.query.id as string;
    if (!trackId) {
      return res.status(400).send('Missing track ID');
    }

    let trackData: any = null;
    const docReq = await db.collection('tracks').doc(trackId).get();
    if (docReq.exists) {
      trackData = docReq.data();
    }

    const title = trackData?.title || "Vectorise - Personal Growth Tracks";
    const description = trackData?.description || "Start a personal growth track today.";
    const image = trackData?.coverImageUrl || "https://vectorise.online/default-share.png"; 
    
    // Determine the base URL internally
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const url = `${baseUrl}/track/${trackId}`;

    const indexHtmlRes = await fetch(`${baseUrl}/index.html`);
    if (!indexHtmlRes.ok) {
      throw new Error(`Failed to fetch base index.html: ${indexHtmlRes.statusText}`);
    }
    const rawHtml = await indexHtmlRes.text();

    const ogTags = `
    <!-- Dynamic OG Tags -->
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />
    `;

    const htmlWithOg = rawHtml.replace('</title>', `</title>\n${ogTags}`);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlWithOg);

  } catch (error) {
    console.error('Error serving track OG page:', error);
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vectorise</title>
          <meta http-equiv="refresh" content="0; url=/" />
        </head>
        <body>Redirecting...</body>
      </html>
    `);
  }
}
