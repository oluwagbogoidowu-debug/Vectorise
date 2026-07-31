import { db } from './lib/firebaseAdmin.js';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const type = ((req.query.type as string) || 'sprint').toLowerCase();
    const id = (req.query.id || req.query.sprintId || req.query.trackId) as string;

    if (!id) {
      return res.status(400).send('Missing ID parameter');
    }

    let title = "Vectorise";
    let description = "Start your personal growth journey today.";
    let image = "https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd";
    let urlPath = `/${type}/${id}`;

    if (type === 'track') {
      let trackData: any = null;
      const docReq = await db.collection('tracks').doc(id).get();
      if (docReq.exists) {
        trackData = docReq.data();
      }
      title = trackData?.title || "Vectorise - Personal Growth Tracks";
      description = trackData?.description || "Start a personal growth track today.";
      if (trackData?.coverImageUrl) {
        image = trackData.coverImageUrl;
      }
      urlPath = `/track/${id}`;
    } else {
      // Default to sprint
      let sprintData: any = null;
      const docReq = await db.collection('sprints').doc(id).collection('sprintdetails').doc('info').get();
      if (docReq.exists) {
        sprintData = docReq.data();
      }
      title = sprintData?.title || "Vectorise - Personal Growth Sprints";
      description = sprintData?.subtitle || sprintData?.description || "Start a personal growth sprint today.";
      if (sprintData?.coverImageUrl) {
        image = sprintData.coverImageUrl;
      }
      urlPath = `/sprint/${id}`;
    }

    image = image.replace(/&/g, '&amp;');

    // Determine the base URL internally
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const url = `${baseUrl}${urlPath}`;

    // Read base index.html
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
    console.error('Error serving OG page:', error);
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
