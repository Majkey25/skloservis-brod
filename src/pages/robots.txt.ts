import type { APIRoute } from 'astro';
import { robotsText, seoContext } from '../lib/seo.ts';

export const GET: APIRoute = ({ site }) =>
  new Response(
    robotsText(seoContext(import.meta.env.SITE_BUILD_TARGET, site, import.meta.env.BASE_URL)),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
