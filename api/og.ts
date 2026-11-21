import {
  DEFAULT_OG_IMAGE,
  fetchSprintMetadataForOg,
  fetchTrackMetadataForOg,
  getRequestBaseUrl,
  injectOgMetaIntoHtml,
  resolveOgImageUrl,
} from './lib/ogHelper';

export default async function handler(req: any, res: any) {
  let urlPath = '/';
  try {
    const typeParam = ((req.query?.type as string) || 'sprint').toLowerCase();
    const type: 'sprint' | 'track' = typeParam === 'track' ? 'track' : 'sprint';
    const id = (req.query?.id || req.query?.sprintId || req.query?.trackId) as string;
    const mode = ((req.query?.mode as string) || '').toLowerCase();

    if (!id) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res
        .status(200)
        .send(
          `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/" /><script>window.location.replace('/');</script></head><body>Redirecting to Vectorise...</body></html>`
        );
    }

    const entity =
      type === 'track'
        ? await fetchTrackMetadataForOg(id)
        : await fetchSprintMetadataForOg(id);

    // Optional binary image proxy mode for data:image/* sprint cover URLs
    if (mode === 'image') {
      const rawImage = entity?.rawImage || '';
      const dataMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (dataMatch) {
        const mime = dataMatch[1];
        const buffer = Buffer.from(dataMatch[2], 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return res.status(200).send(buffer);
      }
      return res.redirect(302, DEFAULT_OG_IMAGE);
    }

    const { baseUrl } = getRequestBaseUrl(req);
    urlPath = `/${type}/${encodeURIComponent(id)}`;
    const refParam = typeof req.query?.ref === 'string' && req.query.ref.trim()
      ? `?ref=${encodeURIComponent(req.query.ref.trim())}`
      : '';
    const fullUrl = `${baseUrl}${urlPath}${refParam}`;

    const title = entity?.title || 'Vectorise';
    const description = entity?.description || 'Start your personal growth journey today.';
    const imageUrl = resolveOgImageUrl({
      rawImage: entity?.rawImage,
      baseUrl,
      entityType: type,
      entityId: id,
    });

    // Read base index.html with fallback
    let rawHtml = '';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidatePaths = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(process.cwd(), 'index.html'),
        path.resolve('index.html'),
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
        const indexHtmlRes = await fetch(`${baseUrl}/index.html`, {
          signal: AbortSignal.timeout(2000),
        });
        if (indexHtmlRes.ok) {
          rawHtml = await indexHtmlRes.text();
        }
      } catch {
        // ignore fetch errors
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    );

    if (rawHtml) {
      const htmlWithOg = injectOgMetaIntoHtml({
        rawHtml,
        title,
        description,
        imageUrl,
        pageUrl: fullUrl,
      });
      return res.status(200).send(htmlWithOg);
    }

    const fallbackHtml = injectOgMetaIntoHtml({
      rawHtml: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vectorise</title>
    <meta http-equiv="refresh" content="0; url=${urlPath}${refParam}" />
    <script>window.location.replace("${urlPath}${refParam}");</script>
  </head>
  <body>
    <p>Loading ${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}...</p>
  </body>
</html>`,
      title,
      description,
      imageUrl,
      pageUrl: fullUrl,
    });

    return res.status(200).send(fallbackHtml);
  } catch (error) {
    console.error('Error serving OG page:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res
      .status(200)
      .send(
        `<!DOCTYPE html><html><head><title>Vectorise</title><meta http-equiv="refresh" content="0; url=${urlPath}" /><script>window.location.replace("${urlPath}");</script></head><body><p>Opening Vectorise...</p></body></html>`
      );
  }
}
