import type { APIRoute } from 'astro';
import { getGallery } from '../content.ts';
import { sitemapXml, seoContext } from '../lib/seo.ts';

export const GET: APIRoute = async ({ site }) => {
  const context = seoContext(import.meta.env.SITE_BUILD_TARGET, site, import.meta.env.BASE_URL);
  return new Response(
    sitemapXml(context, context.target === 'production' ? await getGallery() : []),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
