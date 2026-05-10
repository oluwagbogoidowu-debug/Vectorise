import { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const sprintId = req.query.id as string;
    if (!sprintId) {
      return res.status(400).send('Missing sprint ID');
    }

    let sprintData: any = null;
    const docReq = await db.collection('sprints').doc(sprintId).get();
    if (docReq.exists) {
      sprintData = docReq.data();
    }

    const title = sprintData?.title || "Vectorise - Personal Growth Sprints";
    const description = sprintData?.subtitle || sprintData?.description || "Start a personal growth sprint today.";
    const rawImage = sprintData?.coverImageUrl || "https://vectorise.online/default-share.png";
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const image = `${baseUrl}/api/og-image?url=${encodeURIComponent(rawImage)}&ext=.jpg`.replace(/&/g, '&amp;');
    const url = `${baseUrl}/sprint/${sprintId}`;

    // Read the vanilla index.html that Vercel serves for the SPA
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
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />
    `;

    // Inject the tags into the <head>
    const htmlWithOg = rawHtml.replace('</title>', `</title>\n${ogTags}`);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlWithOg);

  } catch (error) {
    console.error('Error serving sprint OG page:', error);
    // Serve a fallback simple html if fetch fails
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
