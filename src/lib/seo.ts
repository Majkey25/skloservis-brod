import { PRODUCTION_ORIGIN, ROUTES, SERVICE_ROUTES, pageUrl, type Language } from './urls.ts';
import type { Contact, GalleryItem, Service, Settings } from '../content.ts';
import type { Hours } from './schedule.ts';

export type BuildTarget = 'preview' | 'production';

/** One explicit opt-in; NODE_ENV and Astro's default production mode never enable indexing. */
export function deployment(target: string = 'preview') {
  if (target !== 'preview' && target !== 'production') {
    throw new TypeError('SITE_BUILD_TARGET must be preview or production');
  }
  return {
    target,
    site: target === 'production' ? PRODUCTION_ORIGIN : 'https://majkey25.github.io',
    base: target === 'production' ? '/' : '/skloservis-brod/',
  } as const;
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
    robots: indexable ? 'index, follow' : 'noindex, follow',
    canonical: indexable ? new URL(route[lang], context.site).href : undefined,
    alternates: indexable
      ? [
          { lang: 'cs', href: new URL(route.cs, context.site).href },
          { lang: 'en', href: new URL(route.en, context.site).href },
          { lang: 'x-default', href: new URL(route.cs, context.site).href },
        ]
      : [],
    business: indexable && route.id === 'contact',
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

/** Use a photograph actually shown on the page; a missing product photo keeps the brand fallback. */
export function socialPhoto(
  context: SeoContext,
  pathname: string,
  lang: Language,
  gallery: readonly Pick<GalleryItem, 'category' | 'image' | 'alt_cs' | 'alt_en'>[],
) {
  const route = pageRoute(context, pathname, lang);
  if (!route) return undefined;
  if (route.id === 'gallery') return gallery[0];
  if (Object.hasOwn(SERVICE_ROUTES, route.id))
    return gallery.find((photo) => photo.category === route.id);
  return undefined;
}

export function robotsText(context: SeoContext): string {
  return `User-agent: *\nAllow: /\n${context.target === 'production' ? `\nSitemap: ${context.site}/sitemap.xml\n` : ''}`;
}

export function sitemapXml(context: SeoContext): string {
  const urls = context.target === 'production' ? ROUTES.flatMap(({ cs, en }) => [cs, en]) : [];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${new URL(path, context.site).href}</loc></url>`).join('')}</urlset>\n`;
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
  contact: Pick<Contact, 'phone' | 'address' | 'company_id'>,
  hours: Hours,
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
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${context.site}/#business`,
    name: settings.name,
    url: `${context.site}/`,
    telephone: contact.phone,
    email: settings.contact_email,
    identifier: contact.company_id,
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
  value: NonNullable<ReturnType<typeof localBusiness> | ReturnType<typeof serviceBreadcrumbs>>,
): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
