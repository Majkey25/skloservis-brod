import type { APIRoute } from 'astro';
import { sitemapXml, seoContext } from '../lib/seo.ts';

export const GET: APIRoute = ({ site }) =>
  new Response(
    sitemapXml(seoContext(import.meta.env.SITE_BUILD_TARGET, site, import.meta.env.BASE_URL)),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
