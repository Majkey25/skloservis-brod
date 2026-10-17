import { PRODUCTION_ORIGIN, ROUTES, pageUrl, type Language } from './urls.ts';
import type { Contact, Settings } from '../content.ts';
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

export function pageSeo(context: SeoContext, pathname: string, lang: Language) {
  const route = ROUTES.find(({ id }) => pageUrl(id, lang, context.base) === pathname);
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
  // Dated/uncertain exceptions cannot be faithfully represented as recurring weekly hours.
  // Leave the complete dated schedule to the visible, Prague-aware hours component.
  const openingHoursSpecification = hours.exceptions.length
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
export function jsonLd(value: NonNullable<ReturnType<typeof localBusiness>>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
