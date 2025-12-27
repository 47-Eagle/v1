type MetaPayload = {
  title: string;
  description: string;
  url: string;
  canonical?: string;
  image?: string;
  keywords?: string[];
  type?: string;
  jsonLd?: Record<string, any>;
};

const setTag = (selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) => {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  set(el);
};

const setMeta = (name: string, content: string) => {
  if (!content) return;
  setTag(`meta[name="${name}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('name', name);
    return m;
  }, (m) => m.setAttribute('content', content));
};

const setProperty = (property: string, content: string) => {
  if (!content) return;
  setTag(`meta[property="${property}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('property', property);
    return m;
  }, (m) => m.setAttribute('content', content));
};

const setCanonical = (href: string) => {
  if (!href) return;
  setTag('link[rel="canonical"]', () => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    return l;
  }, (l) => l.setAttribute('href', href));
};

const setJsonLd = (data: Record<string, any>) => {
  if (!data) return;
  setTag('script[data-seo-jsonld="true"]', () => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-seo-jsonld', 'true');
    return s;
  }, (s) => {
    s.textContent = JSON.stringify(data, null, 2);
  });
};

export const applySEO = ({
  title,
  description,
  url,
  canonical,
  image,
  keywords,
  type = 'website',
  jsonLd,
}: MetaPayload) => {
  if (title) document.title = title;
  if (description) setMeta('description', description);
  if (keywords?.length) setMeta('keywords', keywords.join(', '));

  const shareImage = image || '';
  const canonicalUrl = canonical || url;

  setCanonical(canonicalUrl);

  // Open Graph
  setProperty('og:title', title);
  setProperty('og:description', description);
  setProperty('og:url', canonicalUrl);
  if (shareImage) setProperty('og:image', shareImage);
  setProperty('og:type', type);

  // Twitter
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  if (shareImage) setMeta('twitter:image', shareImage);

  // JSON-LD (optional)
  if (jsonLd) {
    setJsonLd(jsonLd);
  }
};

export const getDefaultOrgJsonLd = (baseUrl: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Eagle Omnichain Vault',
  url: baseUrl,
  logo: `${baseUrl}/favicon.png`,
  sameAs: [
    'https://x.com/teameagle47',
    'https://t.me/EagleDeFi',
    'https://docs.47eagle.com',
  ],
});


