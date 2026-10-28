import type { APIRoute } from 'astro';
import { robotsText, seoContext } from '../lib/seo.ts';

export const GET: APIRoute = ({ site }) =>
  new Response(
    `# Skloservis Brod | robots.txt
# All public pages and assets may be crawled by all crawlers.
# The production sitemap lists Czech and English pages and their images.
# These crawling rules do not replace access control.

${robotsText(seoContext(import.meta.env.SITE_BUILD_TARGET, site, import.meta.env.BASE_URL))}`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
