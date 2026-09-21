export default async function handler(req: any, res: any) {
  let urlPath = '/';
  try {
    const type = ((req.query?.type as string) || 'sprint').toLowerCase();
    const id = (req.query?.id || req.query?.sprintId || req.query?.trackId) as string;

    if (!id) {
      // If no ID provided, redirect to home
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/" /><script>window.location.replace('/');</script></head><body>Redirecting to Vectorise...</body></html>`);
    }

    let title = "Vectorise";
    let description = "Start your personal growth journey today.";
    let image = "https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd";
    urlPath = `/${type}/${id}`;

    // Direct Firestore REST API fetcher with zero heavy dependencies
    const fetchFirestoreDocument = async (docPath: string): Promise<Record<string, any> | null> => {
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/vectorise-f19d4/databases/(default)/documents/${docPath}`;
        const resp = await fetch(firestoreUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3500)
        });
        if (!resp.ok) return null;
        const json: any = await resp.json();
        if (!json || !json.fields) return null;

        const data: Record<string, any> = {};
        for (const [key, val] of Object.entries(json.fields as Record<string, any>)) {
          if (val.stringValue !== undefined) data[key] = val.stringValue;
          else if (val.integerValue !== undefined) data[key] = Number(val.integerValue);
          else if (val.booleanValue !== undefined) data[key] = val.booleanValue;
          else if (val.doubleValue !== undefined) data[key] = Number(val.doubleValue);
        }
        return data;
      } catch {
        return null;
      }
    };

    if (type === 'track') {
      const trackData = await fetchFirestoreDocument(`tracks/${id}`);
      if (trackData?.title) {
        title = trackData.title;
      }
      if (trackData?.subtitle || trackData?.description) {
        description = trackData.subtitle || trackData.description;
      }
      if (trackData?.coverImageUrl) {
        image = trackData.coverImageUrl;
      }
      urlPath = `/track/${id}`;
    } else {
      // Sprint / Experience lookup
      let sprintData = await fetchFirestoreDocument(`experiences/Sprint/items/${id}/sprintdetails/info`);
      if (!sprintData) {
        sprintData = await fetchFirestoreDocument(`experiences/Challenge/items/${id}/sprintdetails/info`);
      }
      if (!sprintData) {
        sprintData = await fetchFirestoreDocument(`experiences/Ignite/items/${id}/sprintdetails/info`);
      }
      if (!sprintData) {
        sprintData = await fetchFirestoreDocument(`experiences/RiseBlog/items/${id}/sprintdetails/info`);
      }
      if (!sprintData) {
        sprintData = await fetchFirestoreDocument(`experiences/Sprint/items/${id}`);
      }

      if (sprintData?.title) {
        title = sprintData.title;
      }
      if (sprintData?.subtitle || sprintData?.description) {
        description = sprintData.subtitle || sprintData.description;
      }
      if (sprintData?.coverImageUrl) {
        image = sprintData.coverImageUrl;
      }
      urlPath = `/sprint/${id}`;
    }

    image = image.replace(/&/g, '&amp;');
    const safeTitle = title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeDescription = description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Determine the base URL internally
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';
    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'vectorise.life';
    const baseUrl = `${protocol}://${host}`;
    const fullUrl = `${baseUrl}${urlPath}`;

    // Read base index.html with fallback
    let rawHtml = '';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidatePaths = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(process.cwd(), 'index.html'),
        path.resolve('index.html')
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          rawHtml = fs.readFileSync(p, 'utf8');
          break;
        }
      }
    } catch {
      // ignore fs errors
    }

    if (!rawHtml) {
      try {
        const indexHtmlRes = await fetch(`${baseUrl}/index.html`, { signal: AbortSignal.timeout(2000) });
        if (indexHtmlRes.ok) {
          rawHtml = await indexHtmlRes.text();
        }
      } catch {
        // ignore fetch errors
      }
    }

    const ogTags = `
    <!-- Dynamic Vectorise Social Tags -->
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${image}" />
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

    if (rawHtml) {
      const htmlWithOg = rawHtml.includes('</title>') 
        ? rawHtml.replace('</title>', `</title>\n${ogTags}`)
        : rawHtml.replace('</head>', `${ogTags}\n</head>`);
      return res.status(200).send(htmlWithOg);
    }

    // Fallback minimal HTML with redirect for human browsers
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} - Vectorise</title>
    ${ogTags}
    <meta http-equiv="refresh" content="0; url=${urlPath}" />
    <script>window.location.replace("${urlPath}");</script>
  </head>
  <body>
    <div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0b0f19; color: #fff;">
      <p>Loading ${safeTitle}...</p>
    </div>
  </body>
</html>`);

  } catch (error) {
    console.error('Error serving OG page:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html>
  <head>
    <title>Vectorise</title>
    <meta http-equiv="refresh" content="0; url=${urlPath}" />
    <script>window.location.replace("${urlPath}");</script>
  </head>
  <body>
    <p>Opening Vectorise...</p>
  </body>
</html>`);
  }
}
