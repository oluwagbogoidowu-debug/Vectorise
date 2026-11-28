import {
  DEFAULT_OG_IMAGE,
  fetchSprintMetadataForOg,
  fetchTrackMetadataForOg,
  getRequestBaseUrl,
  injectOgMetaIntoHtml,
  resolveOgImageUrl,
} from './lib/ogHelper';

function getFirstString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0].trim();
  return '';
}

export default async function handler(req: any, res: any) {
  let urlPath = '/';
  try {
    const queryTrackId = getFirstString(req.query?.trackId || req.query?.track);
    const querySprintId = getFirstString(req.query?.sprintId || req.query?.sprint);
    const rawType = getFirstString(req.query?.type).toLowerCase();
    const type: 'sprint' | 'track' =
      rawType === 'track' || (!rawType && !!queryTrackId) ? 'track' : 'sprint';

    const rawId = getFirstString(req.query?.id) || (type === 'track' ? queryTrackId : querySprintId);
    const id = rawId.replace(/\/+$/, '');
    const mode = getFirstString(req.query?.mode).toLowerCase();

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

    // Optional binary image proxy mode for data:image/* sprint/track cover URLs
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
    const refVal = getFirstString(req.query?.ref);
    const refParam = refVal ? `?ref=${encodeURIComponent(refVal)}` : '';
    const fullUrl = `${baseUrl}${urlPath}${refParam}`;

    const title = entity?.title || 'Vectorise';
    const description = entity?.description || 'Start your personal growth journey today.';
    const imageUrl = resolveOgImageUrl({
      rawImage: entity?.rawImage,
      baseUrl,
      entityType: type,
      entityId: id,
    });

    const isProdRuntime =
      Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

    // Read built index.html first; in production never serve unbuilt source /index.html pointing to /index.tsx
    let rawHtml = '';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const prodCandidates = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.resolve('dist', 'index.html'),
      ];
      const devCandidates = [
        path.join(process.cwd(), 'index.html'),
        path.resolve('index.html'),
      ];
      const candidatePaths = isProdRuntime
        ? prodCandidates
        : [...prodCandidates, ...devCandidates];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          if (!isProdRuntime || !content.includes('/index.tsx')) {
            rawHtml = content;
            break;
          }
        }
      }
    } catch {
      // ignore fs errors
    }

    if (!rawHtml) {
      try {
        const indexHtmlRes = await fetch(`${baseUrl}/index.html`, {
          signal: AbortSignal.timeout(2500),
        });
        if (indexHtmlRes.ok) {
          const fetched = await indexHtmlRes.text();
          if (!isProdRuntime || !fetched.includes('/index.tsx')) {
            rawHtml = fetched;
          }
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

    const requestPath = (req.url || '').split('?')[0];
    const isDirectOgCall = requestPath === '/api/og' || requestPath === '/og';
    const redirectTags = isDirectOgCall
      ? `\n    <meta http-equiv="refresh" content="0; url=${urlPath}${refParam}" />\n    <script>window.location.replace("${urlPath}${refParam}");</script>`
      : '';

    const fallbackHtml = injectOgMetaIntoHtml({
      rawHtml: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vectorise</title>${redirectTags}
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
        `<!DOCTYPE html><html><head><title>Vectorise</title></head><body><p>Opening Vectorise...</p></body></html>`
      );
  }
}
