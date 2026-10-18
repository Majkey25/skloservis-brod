import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Script, runInNewContext } from 'node:vm';
import { z } from 'astro/zod';
import { createSchemas } from '../src/content.config.ts';
import { ROUTES, SERVICE_ROUTES, type ServiceSlug } from '../src/lib/urls.ts';
import * as seo from '../src/lib/seo.ts';
import {
  deployment,
  seoContext,
  pageSeo,
  robotsText,
  sitemapXml,
  localBusiness,
  jsonLd,
} from '../src/lib/seo.ts';

const preview = seoContext('preview', new URL('https://majkey25.github.io'), '/skloservis-brod/');
const production = seoContext('production', new URL('https://www.skloservis-brod.cz'), '/');
const layout = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
const bootstrapSource = layout.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
assert.ok(bootstrapSource, 'The initial language/theme bootstrap must be present');
const bootstrapScript = new Script(bootstrapSource);
const buildTargetExpression = layout.match(/\bdata-build-target=\{([^}]+)\}/)?.[1];

function bootstrap(
  context: typeof preview,
  {
    path = context.base,
    language = 'cs',
    page = 'home',
    locale = 'en-US',
    savedLanguage,
    savedTheme,
    readyState = 'loading',
    referrer = '',
    navigationType = 'navigate',
    blockedStorage = false,
  }: {
    path?: string;
    language?: string;
    page?: string;
    locale?: string;
    savedLanguage?: string;
    savedTheme?: string;
    readyState?: string;
    referrer?: string;
    navigationType?: string;
    blockedStorage?: boolean;
  } = {},
) {
  const storage = new Map<string, string>();
  for (const [key, value] of [
    ['skloservis-language', savedLanguage],
    ['skloservis-theme', savedTheme],
  ] as const) {
    if (value) storage.set(key, JSON.stringify({ value, expires: Date.now() + 60_000 }));
  }
  const dataset: Record<string, string | undefined> = {
    page,
    language,
    homeEn: `${context.base}en/`,
    buildTarget: buildTargetExpression
      ? runInNewContext(buildTargetExpression, { seo: context })
      : undefined,
  };
  const redirects: string[] = [];
  const colors = new Map<string, string>();
  bootstrapScript.runInNewContext({
    document: {
      documentElement: { dataset },
      readyState,
      referrer,
      querySelector: () => ({
        setAttribute: (key: string, value: string) => colors.set(key, value),
      }),
    },
    localStorage: {
      getItem: (key: string) => {
        if (blockedStorage) throw new Error('Storage denied');
        return storage.get(key) ?? null;
      },
      removeItem: (key: string) => storage.delete(key),
    },
    matchMedia: () => ({ matches: true }),
    navigator: { languages: [locale], language: locale },
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    location: Object.assign(new URL(path, context.site), {
      replace: (url: string) => redirects.push(url),
    }),
    URL,
  });
  return { redirects, dataset, storage, colors };
}

test('production Czech homepage stays at its explicit URL for every language preference', () => {
  for (const locale of ['cs-CZ', 'en-US', 'de-DE', '']) {
    for (const savedLanguage of [undefined, 'cs', 'en']) {
      const result = bootstrap(production, { locale, savedLanguage, savedTheme: 'light' });
      assert.deepEqual(result.redirects, [], `${locale}, saved ${savedLanguage}`);
      assert.equal(result.dataset.language, 'cs');
      assert.equal(result.dataset.theme, 'light');
      assert.equal(result.colors.get('content'), '#ffffff');
      if (savedLanguage)
        assert.equal(JSON.parse(result.storage.get('skloservis-language')!).value, savedLanguage);
    }
  }
});

test('preview initial language selection still follows the device or saved manual choice', () => {
  for (const options of [{}, { locale: 'de-DE' }, { locale: 'cs-CZ', savedLanguage: 'en' }]) {
    assert.deepEqual(bootstrap(preview, options).redirects, [
      'https://majkey25.github.io/skloservis-brod/en/',
    ]);
  }
  for (const options of [{ locale: 'cs-CZ' }, { savedLanguage: 'cs' }, { locale: '' }]) {
    assert.deepEqual(bootstrap(preview, options).redirects, []);
  }
  const denied = bootstrap(preview, { blockedStorage: true });
  assert.equal(denied.dataset.theme, 'dark');
  assert.equal(denied.colors.get('content'), '#071e28');
  assert.deepEqual(denied.redirects, ['https://majkey25.github.io/skloservis-brod/en/']);
});

test('bootstrap preserves localized links, query/hash URLs, history and client-side swaps', () => {
  for (const context of [preview, production]) {
    for (const options of [
      { path: `${context.base}en/`, language: 'en' },
      { path: `${context.base}kontakt/`, page: 'contact' },
      { path: `${context.base}?utm_source=fixture` },
      { path: `${context.base}#main` },
      { referrer: `${context.site}${context.base}en/` },
      { navigationType: 'back_forward' },
      { readyState: 'complete' },
    ]) {
      assert.deepEqual(bootstrap(context, { ...options, savedLanguage: 'en' }).redirects, []);
    }
  }
});

const schemas = createSchemas(z.string());
const settings = schemas.settings.pick({ name: true, contact_email: true }).parse({
  name: 'Test glass workshop',
  contact_email: 'enquiries@example.com',
});
const contact = schemas.contact.pick({ phone: true, company_id: true, address: true }).parse({
  phone: '+420123456789',
  company_id: '12345678',
  address: { street: 'Test street 12', city: 'Test city', postal_code: '123 45', country: 'CZ' },
});
const hours = schemas.hours.parse({
  weekly: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => ({
    day,
    slots: ['mon', 'tue', 'wed', 'thu'].includes(day) ? [{ opens: '08:00', closes: '15:00' }] : [],
  })),
  exceptions: [],
});

test('default configuration stays preview; production is a single explicit local opt-in', () => {
  assert.equal(deployment().target, 'preview');
  for (const value of ['', 'staging', 'Production', 'true']) {
    assert.throws(() => deployment(value), /SITE_BUILD_TARGET/);
  }
  const inspect = (target?: string, actions = 'false') => {
    const env: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: actions };
    delete env.SITE_BUILD_TARGET;
    if (target !== undefined) env.SITE_BUILD_TARGET = target;
    return spawnSync(process.execPath, ['tests/fixtures/seo-config.mjs'], {
      cwd: new URL('../', import.meta.url),
      env,
      encoding: 'utf8',
    });
  };
  const defaultBuild = inspect();
  assert.equal(defaultBuild.status, 0, defaultBuild.stderr);
  assert.deepEqual(JSON.parse(defaultBuild.stdout), {
    site: 'https://majkey25.github.io',
    base: '/skloservis-brod/',
    outDir: './dist/',
    target: '"preview"',
  });
  const futureBuild = inspect('production');
  assert.equal(futureBuild.status, 0, futureBuild.stderr);
  assert.deepEqual(JSON.parse(futureBuild.stdout), {
    site: 'https://www.skloservis-brod.cz',
    base: '/',
    outDir: './.reference/build-production/',
    target: '"production"',
  });
  const actions = inspect('production', 'true');
  assert.notEqual(actions.status, 0);
  assert.match(actions.stderr, /GitHub Actions publishes previews only/);
});

test('wrong origins, credentials, paths and deployment bases fail closed', () => {
  for (const origin of [
    'http://www.skloservis-brod.cz',
    'https://skloservis-brod.cz',
    'https://www.skloservis-brod.cz.evil.example',
    'https://majkey25.github.io',
    'https://user:pass@www.skloservis-brod.cz',
    'https://www.skloservis-brod.cz/path/',
    'https://www.skloservis-brod.cz/?x=1',
    'https://www.skloservis-brod.cz/#fragment',
  ])
    assert.throws(() => seoContext('production', new URL(origin), '/'), /trusted deployment/);
  for (const base of ['/skloservis-brod/', '//', '/en/', '/./', '/?x']) {
    assert.throws(() => seoContext('production', new URL(production.site), base));
  }
  assert.throws(() => seoContext('production', undefined, '/'));
  assert.throws(() => seoContext('preview', new URL(production.site), '/'));
});

test('every preview page and unknown path excludes discovery claims in initial metadata', () => {
  for (const route of ROUTES) {
    for (const lang of ['cs', 'en'] as const) {
      assert.deepEqual(pageSeo(preview, `/skloservis-brod${route[lang]}`, lang), {
        robots: 'noindex, follow',
        canonical: undefined,
        alternates: [],
        business: false,
      });
    }
  }
  assert.equal(robotsText(preview), 'User-agent: *\nAllow: /\n');
  assert.doesNotMatch(sitemapXml(preview), /<loc>|skloservis-brod.cz|github.io/);
});

test('production pairs have absolute self canonicals and reciprocal cs/en/x-default alternates', () => {
  for (const route of ROUTES) {
    const cs = pageSeo(production, route.cs, 'cs');
    const en = pageSeo(production, route.en, 'en');
    assert.equal(cs.canonical, `https://www.skloservis-brod.cz${route.cs}`);
    assert.equal(en.canonical, `https://www.skloservis-brod.cz${route.en}`);
    assert.equal(cs.robots, 'index, follow');
    assert.equal(en.robots, 'index, follow');
    assert.deepEqual(cs.alternates, en.alternates);
    assert.deepEqual(cs.alternates, [
      { lang: 'cs', href: cs.canonical },
      { lang: 'en', href: en.canonical },
      { lang: 'x-default', href: cs.canonical },
    ]);
    assert.equal(cs.business, route.id === 'contact');
    assert.equal(en.business, route.id === 'contact');
  }
  const xml = sitemapXml(production);
  assert.equal((xml.match(/<loc>/g) ?? []).length, ROUTES.length * 2);
  for (const route of ROUTES)
    for (const lang of ['cs', 'en'] as const) {
      assert.ok(xml.includes(`<loc>https://www.skloservis-brod.cz${route[lang]}</loc>`));
    }
  assert.doesNotMatch(xml, /github.io|skloservis-brod\/|404|lastmod|priority/);
  assert.equal(
    robotsText(production),
    'User-agent: *\nAllow: /\n\nSitemap: https://www.skloservis-brod.cz/sitemap.xml\n',
  );
});

test('404, unknown, wrong-language and outside-base paths never inherit a homepage identity', () => {
  for (const context of [preview, production]) {
    for (const path of [
      '/404',
      '/404.html',
      '/404/',
      '/unknown/',
      '/en/unknown/',
      '/en/glass-doors/',
    ]) {
      const meta = pageSeo(context, path, 'cs');
      assert.equal(meta.robots, 'noindex, follow');
      assert.equal(meta.canonical, undefined);
      assert.deepEqual(meta.alternates, []);
      assert.equal(meta.business, false);
    }
  }
});

test('schema uses validated CMS facts and excludes installation/assumed hours and unsupported claims', () => {
  assert.equal(localBusiness(preview, settings, contact, hours), undefined);
  const business = localBusiness(production, settings, contact, hours)!;
  assert.equal(business['@id'], 'https://www.skloservis-brod.cz/#business');
  assert.equal(business.name, settings.name);
  assert.equal(business.telephone, contact.phone);
  assert.equal(business.email, settings.contact_email);
  assert.equal(business.identifier, contact.company_id);
  assert.deepEqual(business.address, {
    '@type': 'PostalAddress',
    streetAddress: contact.address.street,
    addressLocality: contact.address.city,
    postalCode: contact.address.postal_code,
    addressCountry: contact.address.country,
  });
  assert.deepEqual(
    business.openingHoursSpecification?.map((row) => [row.dayOfWeek, row.opens, row.closes]),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => [
      `https://schema.org/${day}`,
      '08:00',
      '15:00',
    ]),
  );
  assert.doesNotMatch(
    jsonLd(business),
    /aggregateRating|review|geo|priceRange|award|Friday|Saturday|Sunday/,
  );
  const editedHours = {
    ...hours,
    weekly: hours.weekly.map((row) => ({
      ...row,
      slots: [{ opens: '09:00', closes: '10:00' }],
      assumed: row.day !== 'fri',
    })),
  };
  assert.deepEqual(
    localBusiness(production, settings, contact, editedHours)?.openingHoursSpecification,
    [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/Friday',
        opens: '09:00',
        closes: '10:00',
      },
    ],
  );
  assert.equal(
    localBusiness(production, settings, contact, {
      ...editedHours,
      weekly: editedHours.weekly.map((row) => ({ ...row, assumed: true })),
    })?.openingHoursSpecification,
    undefined,
  );
  assert.equal(
    localBusiness(production, settings, contact, {
      ...hours,
      exceptions: [{ from: '2030-01-01', to: '2030-01-03', slots: [] }],
    })?.openingHoursSpecification,
    undefined,
  );
  const unsafe = { ...business, name: '</script><script>alert(1)</script>' };
  assert.doesNotMatch(jsonLd(unsafe), /</);
  assert.deepEqual(JSON.parse(jsonLd(unsafe)), unsafe);
});

test('holiday closures never become year-round opening claims in business schema', () => {
  const business = localBusiness(production, settings, contact, {
    ...hours,
    holidays_closed: true,
  });
  assert.equal(business?.openingHoursSpecification, undefined);
  assert.ok(
    localBusiness(production, settings, contact, { ...hours, holidays_closed: false })
      ?.openingHoursSpecification?.length,
  );
});

test('legal pages and unknown URLs describe their own content instead of the homepage', () => {
  assert.equal(typeof seo.defaultDescription, 'function');
  for (const context of [preview, production]) {
    for (const lang of ['cs', 'en'] as const) {
      const descriptions: string[] = [];
      for (const id of ['privacy', 'cookies', 'legal'] as const) {
        const route = ROUTES.find((item) => item.id === id)!;
        const description = seo.defaultDescription(
          context,
          `${context.base}${route[lang].slice(1)}`,
          lang,
          'Homepage fixture',
        );
        assert.ok(description.trim());
        assert.notEqual(description, 'Homepage fixture');
        descriptions.push(description);
      }
      const missing = seo.defaultDescription(
        context,
        `${context.base}404.html`,
        lang,
        'Homepage fixture',
      );
      assert.match(missing, lang === 'cs' ? /nenalezena/i : /not found/i);
      assert.equal(new Set([...descriptions, missing]).size, 4);
      const home = `${context.base}${lang === 'en' ? 'en/' : ''}`;
      assert.equal(
        seo.defaultDescription(context, home, lang, 'Editable homepage copy'),
        'Editable homepage copy',
      );
    }
  }
});

test('service breadcrumbs reflect the visible localized products trail and editable service title', () => {
  assert.equal(typeof seo.serviceBreadcrumbs, 'function');
  for (const [slug, slug_en] of Object.entries(SERVICE_ROUTES)) {
    const service = {
      slug: slug as ServiceSlug,
      title_cs: `Výrobek ${slug}`,
      title_en: `Product ${slug_en}`,
    };
    for (const lang of ['cs', 'en'] as const) {
      const path = lang === 'cs' ? `/${slug}/` : `/en/${slug_en}/`;
      const data = seo.serviceBreadcrumbs(production, path, lang, service)!;
      assert.equal(data['@type'], 'BreadcrumbList');
      assert.deepEqual(data.itemListElement, [
        {
          '@type': 'ListItem',
          position: 1,
          name: lang === 'cs' ? 'Produkty' : 'Products',
          item: `${production.site}${lang === 'cs' ? '/produkty/' : '/en/products/'}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: service[`title_${lang}`],
          item: `${production.site}${path}`,
        },
      ]);
      assert.equal(
        seo.serviceBreadcrumbs(preview, `/skloservis-brod${path}`, lang, service),
        undefined,
      );
      assert.equal(
        seo.serviceBreadcrumbs(production, path, lang === 'cs' ? 'en' : 'cs', service),
        undefined,
      );
      assert.equal(seo.serviceBreadcrumbs(production, path, lang, undefined), undefined);
    }
  }
  const service = {
    slug: 'sklenene-dvere' as const,
    title_cs: '</script><script>alert(1)</script>',
    title_en: 'Doors',
  };
  for (const path of [
    '/404.html',
    '/unknown/',
    '/kontakt/',
    '/sklenene-zabradli/',
    '/en/glass-doors/',
  ]) {
    assert.equal(seo.serviceBreadcrumbs(production, path, 'cs', service), undefined);
  }
  const data = seo.serviceBreadcrumbs(production, '/sklenene-dvere/', 'cs', service)!;
  assert.doesNotMatch(jsonLd(data), /</);
  assert.deepEqual(JSON.parse(jsonLd(data)), data);
});

test('social photographs belong to the actual localized page and never substitute another product', () => {
  assert.equal(typeof seo.socialPhoto, 'function');
  const photo = (category: ServiceSlug, file: string) => ({
    category,
    image: { src: `/_astro/${file}.jpg`, width: 960, height: 640, format: 'jpg' as const },
    alt_cs: `Fotografie ${file}`,
    alt_en: `Photograph ${file}`,
  });
  const railing = photo('sklenene-zabradli', 'railing');
  const doors = photo('sklenene-dvere', 'doors');
  const gallery = [railing, doors, photo('sklenene-dvere', 'other-doors')];
  for (const context of [preview, production]) {
    for (const lang of ['cs', 'en'] as const) {
      const prefix = `${context.base}${lang === 'en' ? 'en/' : ''}`;
      assert.equal(
        seo.socialPhoto(
          context,
          `${prefix}${lang === 'cs' ? 'sklenene-dvere' : 'glass-doors'}/`,
          lang,
          gallery,
        ),
        doors,
      );
      assert.equal(
        seo.socialPhoto(
          context,
          `${prefix}${lang === 'cs' ? 'galerie' : 'gallery'}/`,
          lang,
          gallery,
        ),
        railing,
      );
      assert.equal(
        seo.socialPhoto(context, `${prefix}${lang === 'cs' ? 'galerie' : 'gallery'}/`, lang, []),
        undefined,
      );
      assert.equal(
        seo.socialPhoto(
          context,
          `${prefix}${lang === 'cs' ? 'sklenene-nahrobni-desky' : 'glass-memorial-plaques'}/`,
          lang,
          gallery,
        ),
        undefined,
      );
      assert.equal(seo.socialPhoto(context, `${prefix}404.html`, lang, gallery), undefined);
    }
  }
  assert.equal(seo.socialPhoto(preview, '/sklenene-dvere/', 'cs', gallery), undefined);
  assert.equal(seo.socialPhoto(production, '/en/glass-doors/', 'cs', gallery), undefined);
  assert.equal(seo.socialPhoto(production, '/kontakt/', 'cs', gallery), undefined);
});
