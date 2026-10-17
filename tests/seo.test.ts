import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { CORE_SCHEMA, load } from 'js-yaml';
import { z } from 'astro/zod';
import { createSchemas } from '../src/content.config.ts';
import { ROUTES } from '../src/lib/urls.ts';
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

test('schema uses validated CMS facts and excludes installation/assumed hours and unsupported claims', async () => {
  const schemas = createSchemas(z.string());
  const read = async (name: string) =>
    load(await readFile(new URL(`../src/data/${name}.yaml`, import.meta.url), 'utf8'), {
      schema: CORE_SCHEMA,
    });
  const settings = schemas.settings.parse(await read('settings'));
  const contact = schemas.contact.parse(await read('contact'));
  const hours = schemas.hours.parse(await read('hours'));
  assert.equal(localBusiness(preview, settings, contact, hours), undefined);
  const business = localBusiness(production, settings, contact, hours)!;
  assert.equal(business['@id'], 'https://www.skloservis-brod.cz/#business');
  assert.equal(business.name, settings.name);
  assert.equal(business.telephone, '+420608031206');
  assert.equal(business.email, 'skloservis.brod@gmail.com');
  assert.equal(business.identifier, '02596491');
  assert.deepEqual(business.address, {
    '@type': 'PostalAddress',
    streetAddress: 'Prakšická 281',
    addressLocality: 'Uherský Brod',
    postalCode: '688 01',
    addressCountry: 'CZ',
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
    /aggregateRating|review|geo|priceRange|award|Březnice|Friday|Saturday|Sunday/,
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
