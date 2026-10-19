import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Script, runInNewContext } from 'node:vm';
import sharp from 'sharp';
import { z } from 'astro/zod';
import { createSchemas } from '../src/content.config.ts';
import { ROUTES, SERVICE_ROUTES, type ServiceSlug } from '../src/lib/urls.ts';
import * as seo from '../src/lib/seo.ts';
import {
  artifactProblems,
  deployment,
  seoContext,
  pageSeo,
  robotsText,
  sitemapXml,
  localBusiness,
  website,
  jsonLd,
  workflowTarget,
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

test('default configuration stays preview; production is a single explicit opt-in', () => {
  assert.equal(deployment().target, 'preview');
  for (const value of ['', 'staging', 'Production', 'true']) {
    assert.throws(() => deployment(value), /SITE_BUILD_TARGET/);
  }
  // Every run variable is set explicitly, so the result never depends on the CI event running it.
  const inspect = (
    target?: string,
    actions = 'false',
    run: { event?: string; ref?: string; deploy?: string } = {},
  ) => {
    const env: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: actions };
    for (const name of [
      'SITE_BUILD_TARGET',
      'GITHUB_EVENT_NAME',
      'GITHUB_REF',
      'SITE_DEPLOY_TARGET',
    ]) {
      delete env[name];
    }
    if (target !== undefined) env.SITE_BUILD_TARGET = target;
    if (run.event) env.GITHUB_EVENT_NAME = run.event;
    if (run.ref) env.GITHUB_REF = run.ref;
    if (run.deploy !== undefined) env.SITE_DEPLOY_TARGET = run.deploy;
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
  // In Actions, production builds only for an approved main run.
  const main = 'refs/heads/main';
  for (const run of [
    {},
    { event: 'pull_request', ref: 'refs/pull/7/merge', deploy: 'production' },
    { event: 'push', ref: 'refs/heads/feature', deploy: 'production' },
    { event: 'push', ref: main },
    { event: 'push', ref: main, deploy: 'preview' },
  ]) {
    const refused = inspect('production', 'true', run);
    assert.notEqual(refused.status, 0, JSON.stringify(run));
    assert.match(refused.stderr, /production only on main with SITE_DEPLOY_TARGET=production/);
  }
  const invalid = inspect('production', 'true', { event: 'push', ref: main, deploy: 'prod' });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /SITE_DEPLOY_TARGET must be preview or production/);
  for (const event of ['push', 'workflow_dispatch']) {
    const approved = inspect('production', 'true', { event, ref: main, deploy: 'production' });
    assert.equal(approved.status, 0, approved.stderr);
    assert.equal(JSON.parse(approved.stdout).outDir, './.reference/build-production/');
  }
  // The preview stays buildable in every run, including with the production variable set.
  const preview = inspect('preview', 'true', { event: 'pull_request', deploy: 'production' });
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).outDir, './dist/');
});

test('the workflow selects production only for approved main runs and otherwise selects preview', () => {
  const main = 'refs/heads/main';
  assert.equal(workflowTarget('push', main), 'preview');
  assert.equal(workflowTarget('push', main, ''), 'preview');
  assert.equal(workflowTarget('push', main, 'production'), 'production');
  assert.equal(workflowTarget('workflow_dispatch', main, 'production'), 'production');
  assert.equal(workflowTarget('pull_request', 'refs/pull/7/merge', 'production'), 'preview');
  assert.equal(workflowTarget('pull_request', main, 'production'), 'preview');
  assert.equal(workflowTarget('push', 'refs/heads/feature', 'production'), 'preview');
  assert.equal(workflowTarget('schedule', main, 'production'), 'preview');
  // Selecting preview is not a production rollback while a custom domain remains attached.
  assert.equal(workflowTarget('push', main, 'preview'), 'preview');
  for (const value of [
    'prod',
    'Production',
    'true',
    'staging',
    ' production',
    'production ',
    ' ',
  ]) {
    for (const event of ['push', 'pull_request']) {
      assert.throws(() => workflowTarget(event, main, value), /SITE_DEPLOY_TARGET/);
    }
  }
  assert.equal(deployment('preview').outDir, 'dist');
  assert.equal(deployment('production').outDir, '.reference/build-production');
});

test('artifact checks refuse a preview or production build with the wrong indexing state', () => {
  const page = (path: string, robots: string, canonical?: string, extra = '') => ({
    path,
    html: `<meta name="robots" content="${robots}">${canonical ? `<link rel="canonical" href="${canonical}">` : ''}${extra}`,
  });
  const paths = ROUTES.flatMap(({ cs, en }) => [cs, en]).map((route) =>
    route === '/' ? 'index.html' : `${route.slice(1)}index.html`,
  );
  const origin = 'https://www.skloservis-brod.cz';
  const sitemap = paths.map(() => '<loc>x</loc>').join('');
  const robotsLine = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  const previewPages = [...paths, '404.html'].map((path) => page(path, 'noindex, follow'));
  assert.deepEqual(artifactProblems('preview', previewPages, 'User-agent: *\nAllow: /\n', ''), []);
  const productionPages = [
    ...paths.map((path) =>
      page(path, 'index, follow', `${origin}/${path.replace(/index\.html$/, '')}`),
    ),
    page('404.html', 'noindex, follow'),
  ];
  assert.deepEqual(artifactProblems('production', productionPages, robotsLine, sitemap), []);
  // The author credit may link to another github.io site; only the preview address is refused.
  const withCredit = productionPages.map((item) => ({
    ...item,
    html: `${item.html}<a href="https://majkey25.github.io/init/">Majkey25</a>`,
  }));
  assert.deepEqual(artifactProblems('production', withCredit, robotsLine, sitemap), []);

  const has = (problems: string[], pattern: RegExp) => problems.some((p) => pattern.test(p));
  // A production artifact is never published as the preview, and the reverse.
  assert.ok(
    has(artifactProblems('preview', productionPages, robotsLine, sitemap), /missing noindex/),
  );
  assert.ok(
    has(artifactProblems('production', previewPages, 'User-agent: *\n', ''), /marked noindex/),
  );
  const leak = productionPages.map((item, index) =>
    index === 0 ? { ...item, html: `${item.html}<a href="/skloservis-brod/kontakt/">` } : item,
  );
  assert.ok(has(artifactProblems('production', leak, robotsLine, sitemap), /preview path or host/));
  const wrongCanonical = productionPages.map((item, index) =>
    index === 0
      ? page(item.path, 'index, follow', 'https://majkey25.github.io/skloservis-brod/')
      : item,
  );
  assert.ok(has(artifactProblems('production', wrongCanonical, robotsLine, sitemap), /canonical/));
  assert.ok(
    has(artifactProblems('production', productionPages, 'User-agent: *\n', sitemap), /robots/),
  );
  assert.ok(
    has(artifactProblems('production', productionPages, robotsLine, '<loc>x</loc>'), /sitemap/),
  );
  // Noindex in any order, case or quoting, and the equivalent none, blocks production and
  // satisfies preview.
  for (const meta of [
    '<meta name="robots" content="follow, noindex">',
    '<meta name="robots" content="FOLLOW,NOINDEX">',
    "<meta name='robots' content='none'>",
    '<meta content=noindex name=ROBOTS>',
  ]) {
    const swap = (html: string) => html.replace(/<meta [^>]*>/, meta);
    const blocked = productionPages.map((item, index) =>
      index === 1 ? { ...item, html: swap(item.html) } : item,
    );
    assert.ok(
      has(artifactProblems('production', blocked, robotsLine, sitemap), /marked noindex/),
      meta,
    );
    const reordered = previewPages.map((item) => ({ ...item, html: swap(item.html) }));
    assert.deepEqual(artifactProblems('preview', reordered, 'User-agent: *\n', ''), [], meta);
  }
  // The exact page inventory matters, not just the count.
  const replaced = [...productionPages.slice(1), page('other/index.html', 'noindex, follow')];
  const replacedProblems = artifactProblems('production', replaced, robotsLine, sitemap);
  assert.ok(has(replacedProblems, /^index\.html: page is missing/));
  assert.ok(has(replacedProblems, /^other\/index\.html: unexpected page/));
  // Every known page must point at itself, not at another valid production URL.
  const homeCanonical = productionPages.map((item, index) =>
    index === 1 ? page(item.path, 'index, follow', `${origin}/`) : item,
  );
  assert.ok(
    has(artifactProblems('production', homeCanonical, robotsLine, sitemap), /canonical must be/),
  );
  assert.ok(has(artifactProblems('preview', previewPages, robotsLine, ''), /must not advertise/));
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
        website: false,
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
    assert.equal(cs.robots, 'index, follow, max-image-preview:large');
    assert.equal(en.robots, 'index, follow, max-image-preview:large');
    assert.deepEqual(cs.alternates, en.alternates);
    assert.deepEqual(cs.alternates, [
      { lang: 'cs', href: cs.canonical },
      { lang: 'en', href: en.canonical },
      { lang: 'x-default', href: cs.canonical },
    ]);
    assert.equal(cs.business, route.id === 'home' || route.id === 'contact');
    assert.equal(en.business, route.id === 'home' || route.id === 'contact');
    assert.equal(cs.website, route.id === 'home');
    assert.equal(en.website, false);
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

test('image sitemap maps original photos only to their visible gallery and service pages', () => {
  const doors = {
    category: 'sklenene-dvere' as const,
    image: { src: '/_astro/doors&detail.jpg', width: 960, height: 640, format: 'jpg' as const },
  };
  const mirror = {
    category: 'zrcadla' as const,
    image: { ...doors.image, src: '/_astro/mirror.jpg' },
  };
  const gallery = [doors, mirror, doors];
  const xml = sitemapXml(production, gallery);
  assert.match(xml, /xmlns:image="http:\/\/www.google.com\/schemas\/sitemap-image\/1.1"/);
  const pages = new Map(
    [...xml.matchAll(/<url><loc>(.*?)<\/loc>(.*?)<\/url>/gs)].map((match) => [match[1], match[2]]),
  );
  assert.equal(pages.size, ROUTES.length * 2);
  for (const path of ['/galerie/', '/en/gallery/']) {
    const images = pages.get(`${production.site}${path}`)!;
    assert.equal((images.match(/<image:loc>/g) ?? []).length, 2);
    assert.ok(
      images.includes(`<image:loc>${production.site}/_astro/doors&amp;detail.jpg</image:loc>`),
    );
    assert.ok(images.includes(`<image:loc>${production.site}/_astro/mirror.jpg</image:loc>`));
  }
  for (const path of ['/sklenene-dvere/', '/en/glass-doors/']) {
    const images = pages.get(`${production.site}${path}`)!;
    assert.equal((images.match(/<image:loc>/g) ?? []).length, 1);
    assert.match(images, /doors&amp;detail.jpg/);
    assert.doesNotMatch(images, /mirror/);
  }
  for (const path of ['/', '/en/', '/kontakt/', '/sklenene-zabradli/', '/en/glass-railings/']) {
    assert.equal(pages.get(`${production.site}${path}`), '');
  }
  assert.doesNotMatch(
    xml,
    /<loc>[^<]*(?:zrcadla|#|\?)|image:(?:title|caption|geo_location|license)/,
  );
  assert.doesNotMatch(sitemapXml(preview, gallery), /<loc>|<image:loc>|doors|mirror/);
});

test('image sitemap rejects preview, source and foreign URLs and never silently truncates photos', () => {
  const photo = (src: string) => ({
    category: 'sklenene-dvere' as const,
    image: { src, width: 960, height: 640, format: 'jpg' as const },
  });
  for (const src of [
    '/skloservis-brod/_astro/photo.jpg',
    'https://majkey25.github.io/skloservis-brod/_astro/photo.jpg',
    'https://example.com/_astro/photo.jpg',
    'https://user:pass@www.skloservis-brod.cz/_astro/photo.jpg',
    '/src/assets/gallery/photo.jpg',
    '/_astro/../photo.jpg',
    '/_astro/photo.jpg?source=gallery',
    '/_astro/photo.jpg#detail',
    'data:image/png;base64,AAAA',
    '',
  ]) {
    assert.throws(() => sitemapXml(production, [photo(src)]), /built local/);
    assert.doesNotMatch(sitemapXml(preview, [photo(src)]), /<loc>|<image:loc>/);
  }
  const photos = Array.from({ length: 1000 }, (_, index) => photo(`/_astro/photo-${index}.jpg`));
  assert.equal((sitemapXml(production, photos).match(/<image:loc>/g) ?? []).length, 4000);
  assert.throws(
    () => sitemapXml(production, [...photos, photo('/_astro/extra.jpg')]),
    /1000 images per page/,
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
      assert.equal(meta.website, false);
    }
  }
});

test('site name schema states only the visible brand at the production root URL', () => {
  assert.equal(website(preview), undefined);
  const site = website(production)!;
  assert.deepEqual(site, {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Skloservis Brod',
    url: 'https://www.skloservis-brod.cz/',
  });
  const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
  assert.ok(header.includes(`<span class="brand-name">${site.name}</span>`));
});

test('schema uses validated CMS facts and excludes installation/assumed hours and unsupported claims', () => {
  assert.equal(localBusiness(preview, settings, contact, hours), undefined);
  const business = localBusiness(production, settings, contact, hours)!;
  assert.equal(business['@id'], 'https://www.skloservis-brod.cz/#business');
  assert.equal(business.name, settings.name);
  assert.equal('telephone' in business, false);
  assert.equal('email' in business, false);
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

test('business identity uses the visible optional Facebook profile and respects CMS clearing', () => {
  const profile = schemas.contact.pick({ facebook_url: true });
  const linked = {
    ...contact,
    ...profile.parse({ facebook_url: 'https://www.facebook.com/example/' }),
  };
  const business = localBusiness(production, settings, linked, hours)!;
  assert.deepEqual(business.sameAs, [linked.facebook_url]);
  assert.equal(business['@id'], localBusiness(production, settings, contact, hours)?.['@id']);
  for (const facebook_url of [undefined, null, '']) {
    const cleared = { ...contact, ...profile.parse({ facebook_url }) };
    assert.equal(localBusiness(production, settings, cleared, hours)?.sameAs, undefined);
  }
  assert.equal(localBusiness(preview, settings, linked, hours), undefined);
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

test('business identity reuses visible validated profiles and logo without publishing ratings', () => {
  const schema = schemas.about.pick({ reputation: true, google_reputation: true });
  const profiles = schema.parse({
    reputation: {
      source: 'Firmy.cz',
      url: 'https://www.firmy.cz/detail/13749142-example.html',
      rating: 5,
      count: 4,
      verified_on: '2030-01-01',
    },
    google_reputation: {
      url: 'https://www.google.com/maps?cid=123456',
      rating: 4.5,
      count: 20,
      verified_on: '2030-01-01',
    },
  });
  const logo = '/_astro/logo.png';
  const business = localBusiness(production, settings, contact, hours, profiles, logo)!;
  assert.deepEqual(business.sameAs, [profiles.reputation!.url, profiles.google_reputation!.url]);
  assert.equal(business.logo, `${production.site}${logo}`);
  assert.doesNotMatch(jsonLd(business), /aggregateRating|review|verified_on|count/);
  const cleared = schema.parse({ reputation: {}, google_reputation: {} });
  assert.equal(localBusiness(production, settings, contact, hours, cleared)?.sameAs, undefined);
  assert.equal(localBusiness(preview, settings, contact, hours, profiles, logo), undefined);
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

test('search image metadata uses only visible product/gallery photos on indexable language URLs', () => {
  assert.equal(typeof seo.primaryImage, 'function');
  const photo = {
    category: 'sklenene-dvere' as const,
    image: { src: '/_astro/doors.jpg', width: 1200, height: 800, format: 'jpg' as const },
    alt_cs: 'Skleněné dveře',
    alt_en: 'Glass doors',
  };
  for (const [lang, paths] of [
    ['cs', ['/sklenene-dvere/', '/galerie/']],
    ['en', ['/en/glass-doors/', '/en/gallery/']],
  ] as const) {
    for (const path of paths) {
      assert.deepEqual(seo.primaryImage(production, path, lang, [photo]), {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        url: `${production.site}${path}`,
        primaryImageOfPage: `${production.site}/_astro/doors.jpg`,
      });
      assert.equal(seo.primaryImage(production, path, lang, []), undefined);
      assert.equal(seo.primaryImage(preview, `/skloservis-brod${path}`, lang, [photo]), undefined);
    }
  }
  for (const path of [
    '/',
    '/produkty/',
    '/sluzby/',
    '/kontakt/',
    '/ochrana-osobnich-udaju/',
    '/404.html',
    '/unknown/',
    '/en/glass-doors/',
    '/sklenene-zabradli/',
    '/sklenene-nahrobni-desky/',
  ]) {
    assert.equal(seo.primaryImage(production, path, 'cs', [photo]), undefined);
  }
  assert.throws(
    () =>
      seo.primaryImage(production, '/sklenene-dvere/', 'cs', [
        { ...photo, image: { ...photo.image, src: 'https://example.com/doors.jpg' } },
      ]),
    /built local/,
  );
});

test('branded social previews share a JPEG across languages and respect the deployment base', () => {
  assert.equal(typeof seo.socialPreview, 'function');
  const photo = {
    category: 'sklenene-dvere' as const,
    image: { src: '/_astro/doors.jpg', width: 1200, height: 1600, format: 'jpg' as const },
    alt_cs: 'Skleněné dveře',
    alt_en: 'Glass doors',
  };
  for (const context of [preview, production]) {
    const cs = seo.socialPreview(context, `${context.base}sklenene-dvere/`, 'cs', [photo]);
    const en = seo.socialPreview(context, `${context.base}en/glass-doors/`, 'en', [photo]);
    assert.equal(cs.src, en.src);
    assert.equal(cs.src, `${context.site}${context.base}social/sklenene-dvere.jpg`);
    assert.equal(cs.type, 'image/jpeg');
    assert.equal(cs.width, 1200);
    assert.equal(cs.height, 630);
    assert.equal(cs.photo, photo);
    assert.match(cs.alt, /Grafický náhled.*Skleněné dveře/);
    assert.match(en.alt, /Brand graphic.*Glass doors/);
    for (const path of ['sklenene-nahrobni-desky/', '404.html', 'unknown/']) {
      const image = seo.socialPreview(context, `${context.base}${path}`, 'cs', [photo]);
      assert.equal(image.key, 'brand');
      assert.equal(image.photo, undefined);
      assert.equal(image.src, `${context.site}${context.base}social/brand.jpg`);
      assert.doesNotMatch(image.alt, /fotografi|photograph/i);
    }
    assert.equal(
      seo.socialPreview(context, `${context.base}en/glass-doors/`, 'cs', [photo]).key,
      'brand',
    );
    for (const path of ['', 'produkty/', 'sluzby/', 'galerie/']) {
      assert.equal(
        seo.socialPreview(context, `${context.base}${path}`, 'cs', [photo]).key,
        'overview',
      );
    }
  }
});

test('social art direction finds hashed local assets within their category without changing covers', () => {
  const first = {
    category: 'sklenene-dvere' as const,
    image: { src: '/_astro/cover.jpg', width: 719, height: 960, format: 'jpg' as const },
    alt_cs: 'Titulní fotografie dveří',
    alt_en: 'Door cover photograph',
  };
  const detailed = { ...first, image: { ...first.image, src: '/_astro/detail.jpg', width: 1600 } };
  const curated = {
    ...first,
    image: { ...detailed.image, src: '/_astro/wp-1891-frosted-double-sliding-door-front.ABC.jpg' },
  };
  const foreign = { ...curated, category: 'sklenene-zabradli' as const };
  const gallery = Object.freeze([first, detailed, foreign, curated]);
  const choose = (photos: typeof gallery) =>
    seo.socialPhoto(production, '/sklenene-dvere/', 'cs', photos);
  assert.equal(choose(gallery), curated);
  assert.equal(choose([first, detailed, foreign]), detailed);
  assert.equal(choose([first, foreign]), first);
  assert.equal(choose([foreign]), undefined);
  assert.equal(choose([]), undefined);
  assert.deepEqual(gallery, [first, detailed, foreign, curated]);
});

test('social rendering produces a real 1200x630 JPEG without enlarging or cropping photographs', async () => {
  const { renderSocialImage } = await import('../src/lib/social-image.ts');
  const logo = readFileSync(new URL('../src/assets/brand/wordpress-logo.png', import.meta.url));
  for (const size of [
    { width: 33, height: 55 },
    { width: 1200, height: 800 },
  ]) {
    const photo = await sharp({ create: { ...size, channels: 3, background: '#ff0000' } })
      .png()
      .toBuffer();
    const result = await renderSocialImage(logo, photo);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    assert.equal(metadata.exif, undefined);
    const { data, info } = await sharp(result)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let count = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      if (data[index]! > 230 && data[index + 1]! < 25 && data[index + 2]! < 25) count++;
    }
    const scale = Math.min(1, 744 / size.width, 550 / size.height);
    const expected = Math.round(size.width * scale) * Math.round(size.height * scale);
    assert.ok(
      Math.abs(count - expected) < expected * 0.12,
      `${count} red pixels, expected ${expected}`,
    );
  }
  const brand = await sharp(await renderSocialImage(logo)).metadata();
  assert.deepEqual([brand.format, brand.width, brand.height], ['jpeg', 1200, 630]);
});

test('social artwork composites transparent logo pixels onto the card background', async () => {
  const { renderSocialImage } = await import('../src/lib/social-image.ts');
  const logo = readFileSync(new URL('../src/assets/brand/wordpress-logo.png', import.meta.url));
  const photo = await sharp({
    create: { width: 33, height: 55, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  for (const image of [undefined, photo]) {
    const result = await renderSocialImage(logo, image);
    const left = image ? 48 : 120;
    const top = image ? 56 : 223;
    const pixel = async (x: number) =>
      sharp(result)
        .extract({ left: x, top: top + 2, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer();
    const [outside, corner] = await Promise.all([pixel(left - 4), pixel(left + 2)]);
    assert.ok(corner.every((channel, index) => Math.abs(channel - outside[index]!) < 15));
  }
});
