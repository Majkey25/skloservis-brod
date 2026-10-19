import type { APIRoute } from 'astro';
import { getContact, getServices, getSettings } from '../content.ts';
import { SITE_NAME, seoContext } from '../lib/seo.ts';
import { pageUrl, type Language, type PageId } from '../lib/urls.ts';

/** Optional human/machine directory of existing pages, not a search-engine submission. */
export const GET: APIRoute = async ({ site }) => {
  const context = seoContext(import.meta.env.SITE_BUILD_TARGET, site, import.meta.env.BASE_URL);
  const [settings, contact, services] = await Promise.all([
    getSettings(),
    getContact(),
    getServices(),
  ]);
  const url = (page: PageId, lang: Language) =>
    new URL(pageUrl(page, lang, context.base), context.site).href;
  const label = (text: string) => text.replace(/\s+/g, ' ').replace(/[\[\]\\]/g, '\\$&');
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${label(settings.hero_text_cs)}`,
    '',
    ...(context.target === 'preview'
      ? ['This is a noindex preview, not the production website.', '']
      : []),
    `${label(settings.name)} — ${label(contact.address.city)}, CZ.`,
    '',
    '## Česky',
    `- [Služby a průběh zakázky](${url('services', 'cs')})`,
    ...services.map((service) => `- [${label(service.title_cs)}](${url(service.slug, 'cs')})`),
    `- [Fotogalerie skutečných realizací](${url('gallery', 'cs')})`,
    `- [Kontakt, otevírací doba a poptávka](${url('contact', 'cs')})`,
    `- [Provozovatel a podmínky](${url('legal', 'cs')})`,
    '',
    '## English',
    `- [Services and project process](${url('services', 'en')})`,
    ...services.map((service) => `- [${label(service.title_en)}](${url(service.slug, 'en')})`),
    `- [Gallery of actual projects](${url('gallery', 'en')})`,
    `- [Contact, opening hours and enquiries](${url('contact', 'en')})`,
    `- [Company information and terms](${url('legal', 'en')})`,
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
