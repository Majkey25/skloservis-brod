/** Retained public origin for a separately authorized production launch. */
export const PRODUCTION_ORIGIN = 'https://www.skloservis-brod.cz';

export type Language = 'cs' | 'en';

/** Stable content slugs, independent of editable titles and collection entry IDs. */
export const SERVICE_ROUTES = {
  'sklenene-dvere': 'glass-doors',
  'sklenene-zabradli': 'glass-railings',
  'skleneny-sprchovy-kout': 'glass-shower-enclosures',
  'sklenena-stena': 'glass-partitions',
  'skleneny-obklad-do-kuchyne': 'glass-kitchen-splashbacks',
  'sklenene-strisky-zaskleni-pergol-zastreseni': 'glass-canopies-pergola-glazing',
  'sklenene-dekorace-gravirovani-fotek': 'glass-decorations-photo-engraving',
  'sklenene-nahrobni-desky': 'glass-memorial-plaques',
} as const;

export type ServiceSlug = keyof typeof SERVICE_ROUTES;

const MAIN_ROUTES = [
  { id: 'home', cs: '/', en: '/en/' },
  { id: 'products', cs: '/produkty/', en: '/en/products/' },
  { id: 'services', cs: '/sluzby/', en: '/en/services/' },
  { id: 'gallery', cs: '/galerie/', en: '/en/gallery/' },
  { id: 'contact', cs: '/kontakt/', en: '/en/contact/' },
  { id: 'privacy', cs: '/ochrana-osobnich-udaju/', en: '/en/privacy/' },
  { id: 'cookies', cs: '/cookies/', en: '/en/cookies/' },
  { id: 'legal', cs: '/pravni-informace/', en: '/en/legal/' },
] as const;

export type PageId = (typeof MAIN_ROUTES)[number]['id'] | ServiceSlug;
export type PageRoute = Readonly<{ id: PageId; cs: string; en: string }>;

/** Base-free route pairs for future static paths, navigation and production sitemap generation. */
export const ROUTES: readonly PageRoute[] = [
  ...MAIN_ROUTES,
  ...(Object.keys(SERVICE_ROUTES) as ServiceSlug[]).map((slug) => ({
    id: slug,
    cs: `/${slug}/`,
    en: `/en/${SERVICE_ROUTES[slug]}/`,
  })),
];

/** Normalize an explicitly supplied deployment pathname, never a host or URL. */
function normalizeBase(base: string): string {
  const segments = base.split('/').filter(Boolean);
  if (/[\\?#:\s]/.test(base) || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new TypeError('Base must be a pathname without dot segments, query or fragment');
  }
  return segments.length ? `/${segments.join('/')}/` : '/';
}

/** Pass import.meta.env.BASE_URL at the Astro call site; this module has no runtime dependencies. */
export function pageUrl(page: PageId, language: Language = 'cs', base = '/'): string {
  const route = ROUTES.find(({ id }) => id === page);
  if (!route) throw new RangeError(`Unknown page: ${page}`);
  return normalizeBase(base) + route[language].slice(1);
}

/** Resolve URL.pathname to the same page in another language; unknown paths have no equivalent. */
export function equivalentLanguageUrl(
  pathname: string,
  language: Language,
  base = '/',
): string | undefined {
  const prefix = normalizeBase(base);
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!pathname.startsWith('/') || !path.startsWith(prefix)) return undefined;
  const localPath = `/${path.slice(prefix.length)}`;
  const route = ROUTES.find(({ cs, en }) => cs === localPath || en === localPath);
  return route ? pageUrl(route.id, language, prefix) : undefined;
}
