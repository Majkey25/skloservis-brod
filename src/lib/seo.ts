import { PRODUCTION_ORIGIN, ROUTES, SERVICE_ROUTES, pageUrl, type Language } from './urls.ts';
import type { About, Contact, GalleryItem, Service, Settings } from '../content.ts';
import type { Hours } from './schedule.ts';

export type BuildTarget = 'preview' | 'production';

export const SITE_NAME = 'Skloservis Brod';

/** One explicit opt-in; NODE_ENV and Astro's default production mode never enable indexing. */
export function deployment(target: string = 'preview') {
  if (target !== 'preview' && target !== 'production') {
    throw new TypeError('SITE_BUILD_TARGET must be preview or production');
  }
  return {
    target,
    site: target === 'production' ? PRODUCTION_ORIGIN : 'https://majkey25.github.io',
    base: target === 'production' ? '/' : '/skloservis-brod/',
    outDir: target === 'production' ? '.reference/build-production' : 'dist',
  } as const;
}

/**
 * The Pages target of one workflow run. The repository variable SITE_DEPLOY_TARGET (unset means
 * preview) applies only to pushes and manual runs on main; pull requests and other branches always
 * build the noindex preview. Any other value fails, so a typo can never publish by accident.
 */
export function workflowTarget(event: string, ref: string, configured = ''): BuildTarget {
  const value = configured || 'preview';
  if (value !== 'preview' && value !== 'production') {
    throw new TypeError(`SITE_DEPLOY_TARGET must be preview or production, not "${configured}"`);
  }
  const main = ref === 'refs/heads/main' && (event === 'push' || event === 'workflow_dispatch');
  return main ? value : 'preview';
}

/** One attribute value of an HTML tag, double, single or unquoted. */
function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(
    String.raw`\s${name}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))`,
    'i',
  ).exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

/** True when any robots meta tag carries noindex or none, in any order, case or quoting. */
function blocksIndexing(html: string): boolean {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some(
    ([tag]) =>
      attribute(tag, 'name')?.trim().toLowerCase() === 'robots' &&
      (attribute(tag, 'content') ?? '')
        .split(',')
        .some((token) => ['noindex', 'none'].includes(token.trim().toLowerCase())),
  );
}

/** Problems that must stop an artifact from being published as the selected target. */
export function artifactProblems(
  target: BuildTarget,
  pages: readonly { path: string; html: string }[],
  robots: string,
  sitemap: string,
): string[] {
  const problems: string[] = [];
  // Each route's built file, e.g. '/kontakt/' -> 'kontakt/index.html', and its own canonical.
  const canonicals = new Map(
    ROUTES.flatMap(({ cs, en }) => [cs, en]).map((path) => [
      `${path.slice(1)}index.html`,
      new URL(path, PRODUCTION_ORIGIN).href,
    ]),
  );
  const expected = new Set([...canonicals.keys(), '404.html']);
  const found = new Set(pages.map(({ path }) => path));
  for (const path of expected) if (!found.has(path)) problems.push(`${path}: page is missing`);
  for (const path of found) if (!expected.has(path)) problems.push(`${path}: unexpected page`);
  for (const { path, html } of pages) {
    const noindex = blocksIndexing(html);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (target === 'preview') {
      if (!noindex) problems.push(`${path}: preview page is missing noindex`);
      if (canonical) problems.push(`${path}: preview page must not declare a canonical URL`);
      continue;
    }
    const own = canonicals.get(path);
    if (!own) {
      if (!noindex) problems.push(`${path}: a page without a route must stay noindex`);
    } else {
      if (noindex) problems.push(`${path}: production page is marked noindex`);
      if (canonical !== own) problems.push(`${path}: production canonical must be ${own}`);
    }
    if (
      /["'(]\/skloservis-brod\//.test(html) ||
      html.includes('majkey25.github.io/skloservis-brod')
    ) {
      problems.push(`${path}: production page still points at the preview path or host`);
    }
  }
  const sitemapLine = `Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`;
  if (target === 'production') {
    if (!robots.includes(sitemapLine)) problems.push(`robots.txt must list ${sitemapLine}`);
    const urls = sitemap.match(/<loc>/g)?.length ?? 0;
    if (urls !== ROUTES.length * 2) {
      problems.push(`sitemap.xml must list ${ROUTES.length * 2} pages, found ${urls}`);
    }
  } else if (robots.includes('Sitemap:')) {
    problems.push('Preview robots.txt must not advertise a sitemap');
  }
  return problems;
}

/** Fail closed on host/base overrides rather than silently publish conflicting SEO claims. */
export function seoContext(target: string, site: URL | undefined, base: string) {
  const expected = deployment(target);
  if (
    !site ||
    site.href !== `${expected.site}/` ||
    (base.endsWith('/') ? base : `${base}/`) !== expected.base
  ) {
    throw new TypeError('SEO site and base must match the selected trusted deployment');
  }
  return expected;
}

type SeoContext = ReturnType<typeof seoContext>;

function pageRoute(context: SeoContext, pathname: string, lang: Language) {
  return ROUTES.find(({ id }) => pageUrl(id, lang, context.base) === pathname);
}

/** Legal Markdown and the 404 have no CMS description; do not advertise homepage services there. */
export function defaultDescription(
  context: SeoContext,
  pathname: string,
  lang: Language,
  homepage: string,
): string {
  const route = pageRoute(context, pathname, lang);
  if (!route)
    return lang === 'cs'
      ? 'Stránka nenalezena. Pokračujte na českou nebo anglickou úvodní stránku Skloservis Brod.'
      : 'Page not found. Continue to the Czech or English Skloservis Brod homepage.';
  switch (route.id) {
    case 'privacy':
      return lang === 'cs'
        ? 'Jak Skloservis Brod zpracovává údaje z poptávek, jak je uchovává a jak uplatnit práva k osobním údajům.'
        : 'How Skloservis Brod processes and retains enquiry information, and how to exercise your personal data rights.';
    case 'cookies':
      return lang === 'cs'
        ? 'Informace o cookies, uložení volby jazyka a motivu v prohlížeči a souhlasu s volitelnou mapou Google.'
        : 'Information about cookies, saved language and theme preferences, and consent for the optional Google map.';
    case 'legal':
      return lang === 'cs'
        ? 'Údaje provozovatele Skloservis Brod, informace o poptávkách, reklamacích a mimosoudním řešení spotřebitelských sporů.'
        : 'Skloservis Brod company details, enquiries, complaints and consumer alternative dispute resolution information.';
    default:
      return homepage;
  }
}

export function pageSeo(context: SeoContext, pathname: string, lang: Language) {
  const route = pageRoute(context, pathname, lang);
  const indexable = context.target === 'production' && !!route;
  return {
    robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    canonical: indexable ? new URL(route[lang], context.site).href : undefined,
    alternates: indexable
      ? [
          { lang: 'cs', href: new URL(route.cs, context.site).href },
          { lang: 'en', href: new URL(route.en, context.site).href },
          { lang: 'x-default', href: new URL(route.cs, context.site).href },
        ]
      : [],
    business: indexable && (route.id === 'home' || route.id === 'contact'),
    website: indexable && route.id === 'home' && lang === 'cs',
  };
}

/** The visible brand as Google's preferred site name, on the root homepage only; no rank claim. */
export function website(context: SeoContext) {
  if (context.target !== 'production') return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${context.site}/`,
  };
}

/** Match the two visible breadcrumb items on service detail pages, never the shell's page ID. */
export function serviceBreadcrumbs(
  context: SeoContext,
  pathname: string,
  lang: Language,
  service: Pick<Service, 'slug' | 'title_cs' | 'title_en'> | undefined,
) {
  const route = pageRoute(context, pathname, lang);
  if (context.target !== 'production' || !route || !service || route.id !== service.slug)
    return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: lang === 'cs' ? 'Produkty' : 'Products',
        item: new URL(pageUrl('products', lang), context.site).href,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: service[`title_${lang}`],
        item: new URL(route[lang], context.site).href,
      },
    ],
  };
}

// Art direction only: these are existing gallery files, never changes to gallery order or covers.
const SOCIAL_PHOTOS: Partial<Record<keyof typeof SERVICE_ROUTES | 'overview', string>> = {
  overview: 'office-glass-corridor',
  'sklenene-dvere': 'wp-1891-frosted-double-sliding-door-front',
  'sklenene-zabradli': 'entrance-stair-glass-railing',
  'skleneny-sprchovy-kout': 'shower-clear-glass',
  'sklenena-stena': 'office-glass-corridor',
  'skleneny-obklad-do-kuchyne': 'kitchen-window-splashback',
  'sklenene-strisky-zaskleni-pergol-zastreseni': 'wp-1992-glass-canopy-support-rods-entrance',
  'sklenene-dekorace-gravirovani-fotek': 'wp-2005-music-motif-glass-coasters',
};

/** Brand overviews may use the gallery; a product may only use its own actual category. */
export function socialPhoto(
  context: SeoContext,
  pathname: string,
  lang: Language,
  gallery: readonly Pick<GalleryItem, 'category' | 'image' | 'alt_cs' | 'alt_en'>[],
) {
  const route = pageRoute(context, pathname, lang);
  if (!route) return undefined;
  const overview = ['home', 'products', 'services', 'gallery'].includes(route.id);
  if (!overview && !Object.hasOwn(SERVICE_ROUTES, route.id)) return undefined;
  const candidates = overview ? gallery : gallery.filter((photo) => photo.category === route.id);
  const preferred =
    SOCIAL_PHOTOS[overview ? 'overview' : (route.id as keyof typeof SERVICE_ROUTES)];
  return (
    candidates.find((photo) => photo.image.src.split('/').at(-1)?.startsWith(`${preferred}.`)) ??
    candidates.find((photo) => photo.image.width >= 1000 && photo.image.height >= 630) ??
    candidates[0]
  );
}

/** Both language versions reference one build-time composite, with localized accessible text. */
export function socialPreview(
  context: SeoContext,
  pathname: string,
  lang: Language,
  gallery: Parameters<typeof socialPhoto>[3],
) {
  const photo = socialPhoto(context, pathname, lang, gallery);
  const route = pageRoute(context, pathname, lang);
  const key = photo ? (Object.hasOwn(SERVICE_ROUTES, route!.id) ? route!.id : 'overview') : 'brand';
  return {
    key,
    photo,
    src: new URL(`${context.base}social/${key}.jpg`, context.site).href,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: photo
      ? lang === 'cs'
        ? `Grafický náhled Skloservis Brod s logem a fotografií: ${photo.alt_cs}`
        : `Brand graphic for Skloservis Brod with its logo and a photograph: ${photo.alt_en}`
      : lang === 'cs'
        ? 'Grafický náhled s logem Skloservis Brod na petrolejovém pozadí'
        : 'Brand graphic with the Skloservis Brod logo on a teal background',
  };
}

/** Prefer a real, visible photograph for search; keep branded social artwork separate. */
export function primaryImage(
  context: SeoContext,
  pathname: string,
  lang: Language,
  gallery: Parameters<typeof socialPhoto>[3],
) {
  const route = pageRoute(context, pathname, lang);
  if (
    context.target !== 'production' ||
    !route ||
    (route.id !== 'gallery' && !Object.hasOwn(SERVICE_ROUTES, route.id))
  )
    return undefined;
  const photo = socialPhoto(context, pathname, lang, gallery);
  if (!photo) return undefined;
  const image = new URL(photo.image.src, context.site);
  if (image.origin !== context.site || !image.pathname.startsWith('/_astro/'))
    throw new TypeError('Search images must use built local /_astro/ URLs');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: new URL(route[lang], context.site).href,
    primaryImageOfPage: image.href,
  };
}

export function robotsText(context: SeoContext): string {
  return `User-agent: *\nAllow: /\n${context.target === 'production' ? `\nSitemap: ${context.site}/sitemap.xml\n` : ''}`;
}

function xmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Use the original image links already rendered by Gallery and ServiceDetail. */
export function sitemapXml(
  context: SeoContext,
  gallery: readonly Pick<GalleryItem, 'category' | 'image'>[] = [],
): string {
  const urls =
    context.target === 'production'
      ? ROUTES.flatMap(({ id, cs, en }) => {
          const images = [
            ...new Set(
              gallery
                .filter((photo) => id === 'gallery' || photo.category === id)
                .map(({ image }) => {
                  const url = new URL(image.src, context.site);
                  if (
                    url.origin !== context.site ||
                    !url.pathname.startsWith('/_astro/') ||
                    url.username ||
                    url.password ||
                    url.search ||
                    url.hash
                  ) {
                    throw new TypeError('Sitemap images must use built local /_astro/ URLs');
                  }
                  return url.href;
                }),
            ),
          ];
          if (images.length > 1000) throw new RangeError('Sitemap allows 1000 images per page');
          const imageTags = images
            .map((url) => `<image:image><image:loc>${xmlText(url)}</image:loc></image:image>`)
            .join('');
          return [cs, en].map(
            (path) =>
              `<url><loc>${xmlText(new URL(path, context.site).href)}</loc>${imageTags}</url>`,
          );
        })
      : [];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}</urlset>\n`;
}

const SCHEMA_DAYS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
} as const;

/** Inputs come from the validated CMS getters; never imply closures or installation hours. */
export function localBusiness(
  context: SeoContext,
  settings: Pick<Settings, 'name' | 'contact_email'>,
  contact: Pick<Contact, 'phone' | 'address' | 'company_id' | 'facebook_url'>,
  hours: Hours,
  profiles?: Pick<About, 'reputation' | 'google_reputation'>,
  logo?: string,
) {
  if (context.target !== 'production') return undefined;
  // Dated exceptions and movable holidays cannot be represented as year-round weekly hours.
  // Leave the complete dated schedule to the visible, Prague-aware hours component.
  const openingHoursSpecification =
    hours.exceptions.length || hours.holidays_closed
      ? []
      : hours.weekly
          .filter((row) => !row.assumed)
          .flatMap((row) =>
            row.slots.map((slot) => ({
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: `https://schema.org/${SCHEMA_DAYS[row.day]}`,
              opens: slot.opens,
              closes: slot.closes,
            })),
          );
  const sameAs = [
    contact.facebook_url,
    profiles?.reputation?.url,
    profiles?.google_reputation?.url,
  ].filter((url): url is string => !!url);
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${context.site}/#business`,
    name: settings.name,
    url: `${context.site}/`,
    telephone: contact.phone,
    email: settings.contact_email,
    identifier: contact.company_id,
    ...(sameAs.length ? { sameAs } : {}),
    ...(logo ? { logo: new URL(logo, context.site).href } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address.street,
      addressLocality: contact.address.city,
      postalCode: contact.address.postal_code,
      addressCountry: contact.address.country,
    },
    ...(openingHoursSpecification.length ? { openingHoursSpecification } : {}),
  };
}

/** JSON-LD is data, not executable code; prevent CMS text from closing its script element. */
export function jsonLd(
  value: NonNullable<
    | ReturnType<typeof localBusiness>
    | ReturnType<typeof serviceBreadcrumbs>
    | ReturnType<typeof website>
    | ReturnType<typeof primaryImage>
  >,
): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
