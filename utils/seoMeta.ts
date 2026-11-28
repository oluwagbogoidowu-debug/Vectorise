export function normalizeClientOgImageUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const fileMatch = trimmed.match(/drive\.google\.com\/(?:u\/\d+\/)?file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w1200`;
  }

  const queryMatch = trimmed.match(
    /drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i
  );
  if (queryMatch && queryMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${queryMatch[1]}=w1200`;
  }

  const lh3Match = trimmed.match(
    /^https?:\/\/lh3\.googleusercontent\.com\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:[?#].*)?$/i
  );
  if (lh3Match && lh3Match[1]) {
    return `https://lh3.googleusercontent.com/d/${lh3Match[1]}=w1200`;
  }

  return trimmed;
}

function setOrCreateMetaTag(attr: 'property' | 'name', key: string, value: string) {
  if (!value || typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setOrCreateCanonicalLink(href: string) {
  if (!href || typeof document === 'undefined') return;
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function applyEntityOgMeta({
  title,
  description,
  rawImage,
  entityType,
  entityId,
  canonicalUrl,
}: {
  title: string;
  description?: string;
  rawImage?: string;
  entityType: 'sprint' | 'track';
  entityId?: string;
  canonicalUrl?: string;
}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const cleanTitle = (title || (entityType === 'track' ? 'Vectorise Track' : 'Vectorise Sprint')).trim();
  const cleanDesc = (description || 'Start your personal growth journey today.')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

  const pageUrl = canonicalUrl || `${window.location.origin}${window.location.pathname}`;
  const trimmedImage = (rawImage || '').trim();
  let resolvedImage = '';
  if (trimmedImage.startsWith('data:image/') && entityId) {
    resolvedImage = `${window.location.origin}/api/og?mode=image&type=${encodeURIComponent(entityType)}&id=${encodeURIComponent(entityId)}`;
  } else if (trimmedImage && !trimmedImage.startsWith('data:image/')) {
    const normalized = normalizeClientOgImageUrl(trimmedImage);
    if (normalized.startsWith('/')) {
      resolvedImage = `${window.location.origin}${normalized}`;
    } else if (/^https?:\/\//i.test(normalized)) {
      resolvedImage = normalized;
    }
  }

  document.title =
    cleanTitle.toLowerCase() === 'vectorise'
      ? 'Vectorise – Personal Growth Sprints'
      : `${cleanTitle} – Vectorise`;

  setOrCreateCanonicalLink(pageUrl);
  setOrCreateMetaTag('name', 'description', cleanDesc);
  setOrCreateMetaTag('property', 'og:site_name', 'Vectorise');
  setOrCreateMetaTag('property', 'og:type', 'website');
  setOrCreateMetaTag('property', 'og:title', cleanTitle);
  setOrCreateMetaTag('property', 'og:description', cleanDesc);
  setOrCreateMetaTag('property', 'og:url', pageUrl);
  setOrCreateMetaTag('name', 'twitter:card', 'summary_large_image');
  setOrCreateMetaTag('name', 'twitter:title', cleanTitle);
  setOrCreateMetaTag('name', 'twitter:description', cleanDesc);

  if (resolvedImage) {
    setOrCreateMetaTag('property', 'og:image', resolvedImage);
    setOrCreateMetaTag('property', 'og:image:secure_url', resolvedImage);
    setOrCreateMetaTag('property', 'og:image:alt', cleanTitle);
    setOrCreateMetaTag('name', 'twitter:image', resolvedImage);
  }
}
