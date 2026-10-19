import type { APIRoute } from 'astro';
import { seoContext } from '../lib/seo.ts';

export const GET: APIRoute = ({ site }) => {
  const context = seoContext(import.meta.env.SITE_BUILD_TARGET, site, import.meta.env.BASE_URL);
  const sitemap =
    context.target === 'production'
      ? `<sitemap><loc>${new URL('sitemap.xml', context.site).href}</loc></sitemap>`
      : '';
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}</sitemapindex>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
