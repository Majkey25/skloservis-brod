import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCTION_ORIGIN,
  ROUTES,
  SERVICE_ROUTES,
  equivalentLanguageUrl,
  pageUrl,
} from '../src/lib/urls.ts';

// Independent regression baseline; CI must not need private research or source archives.
const HISTORICAL_PAIRS = [
  ['/', '/en/'],
  ['/produkty/', '/en/products/'],
  ['/sluzby/', '/en/services/'],
  ['/galerie/', '/en/gallery/'],
  ['/kontakt/', '/en/contact/'],
  ['/ochrana-osobnich-udaju/', '/en/privacy/'],
  ['/sklenene-dvere/', '/en/glass-doors/'],
  ['/sklenene-zabradli/', '/en/glass-railings/'],
  ['/skleneny-sprchovy-kout/', '/en/glass-shower-enclosures/'],
  ['/sklenena-stena/', '/en/glass-partitions/'],
  ['/skleneny-obklad-do-kuchyne/', '/en/glass-kitchen-splashbacks/'],
  ['/sklenene-strisky-zaskleni-pergol-zastreseni/', '/en/glass-canopies-pergola-glazing/'],
  ['/sklenene-dekorace-gravirovani-fotek/', '/en/glass-decorations-photo-engraving/'],
  ['/sklenene-nahrobni-desky/', '/en/glass-memorial-plaques/'],
] as const;

test('all 14 historical pairs stay exact while allowing additional pages', () => {
  assert.equal(HISTORICAL_PAIRS.length, 14);
  for (const [cs, en] of HISTORICAL_PAIRS) {
    const route = ROUTES.find((row) => row.cs === cs);
    assert.ok(route, `Missing historical route: ${cs}`);
    assert.equal(route.en, en, cs);
  }
});

test('all page identities and localized paths are unique with canonical trailing slashes', () => {
  assert.equal(new Set(ROUTES.map(({ id }) => id)).size, ROUTES.length);
  assert.equal(new Set(ROUTES.flatMap(({ cs, en }) => [cs, en])).size, ROUTES.length * 2);
  for (const { id, cs, en } of ROUTES) {
    assert.equal(pageUrl(id), cs);
    assert.equal(pageUrl(id, 'en'), en);
    assert.ok(cs.startsWith('/') && !cs.startsWith('/cs/') && !cs.startsWith('/en/'));
    assert.ok(en.startsWith('/en/'));
    assert.ok(cs.endsWith('/') && en.endsWith('/'));
  }
});

test('all eight service identities expand to the shared page inventory', () => {
  assert.equal(Object.keys(SERVICE_ROUTES).length, 8);
  assert.equal(new Set(Object.values(SERVICE_ROUTES)).size, 8);
  for (const [cs, en] of Object.entries(SERVICE_ROUTES)) {
    assert.deepEqual(
      ROUTES.find(({ id }) => id === cs),
      {
        id: cs,
        cs: `/${cs}/`,
        en: `/en/${en}/`,
      },
    );
  }
});

test('pageUrl normalizes root, repository and nested bases without losing trailing slashes', () => {
  for (const base of ['', '/', '///']) {
    assert.equal(pageUrl('home', 'cs', base), '/');
    assert.equal(pageUrl('home', 'en', base), '/en/');
    assert.equal(pageUrl('contact', 'cs', base), '/kontakt/');
  }
  for (const base of [
    'skloservis-brod',
    '/skloservis-brod',
    '/skloservis-brod/',
    '//skloservis-brod///',
  ]) {
    assert.equal(pageUrl('home', 'cs', base), '/skloservis-brod/');
    assert.equal(pageUrl('home', 'en', base), '/skloservis-brod/en/');
    assert.equal(pageUrl('sklenene-dvere', 'en', base), '/skloservis-brod/en/glass-doors/');
  }
  assert.equal(pageUrl('gallery', 'en', '//preview///site//'), '/preview/site/en/gallery/');
});

test('every deep equivalent link keeps its page identity and base in both directions', () => {
  for (const base of [
    '',
    '/',
    'skloservis-brod',
    '/skloservis-brod/',
    '//preview///site//',
    '/en/',
  ]) {
    for (const { id } of ROUTES) {
      const cs = pageUrl(id, 'cs', base);
      const en = pageUrl(id, 'en', base);
      assert.equal(equivalentLanguageUrl(cs, 'en', base), en);
      assert.equal(equivalentLanguageUrl(en, 'cs', base), cs);
      assert.equal(equivalentLanguageUrl(cs, 'cs', base), cs);
      assert.equal(equivalentLanguageUrl(en, 'en', base), en);
      if (cs !== '/') assert.equal(equivalentLanguageUrl(cs.slice(0, -1), 'en', base), en);
      assert.equal(equivalentLanguageUrl(en.slice(0, -1), 'cs', base), cs);
    }
  }
});

test('unknown paths and lookalike base prefixes do not fall back to the homepage', () => {
  const base = '/skloservis-brod/';
  for (const pathname of [
    '/skloservis-brod-other/kontakt/',
    '/skloservis-brodish/',
    '/kontakt/',
    '/skloservis-brod/unknown/',
    '/skloservis-brod/cs/kontakt/',
    '/skloservis-brod/en/kontakt/',
    '/skloservis-brod//kontakt/',
    '/skloservis-brod/kontakt/?sent=1',
    '/skloservis-brod/kontakt/#form',
    'https://www.skloservis-brod.cz/kontakt/',
    '',
  ])
    assert.equal(equivalentLanguageUrl(pathname, 'en', base), undefined, pathname);
  assert.equal(equivalentLanguageUrl('/home/', 'en'), undefined);
});

test('bases must be path prefixes, not origins, query strings or dot segments', () => {
  for (const base of [
    'https://example.com/site',
    '/site?x=1',
    '/site#x',
    '/site/../other',
    './site',
    'site\\nested',
    '/a b',
  ]) {
    assert.throws(() => pageUrl('home', 'cs', base), TypeError, base);
    assert.throws(() => equivalentLanguageUrl('/', 'en', base), TypeError, base);
  }
});

test('future production URLs keep the HTTPS www origin and omit the preview prefix', () => {
  assert.equal(PRODUCTION_ORIGIN, 'https://www.skloservis-brod.cz');
  assert.equal(
    new URL(pageUrl('sklenene-dvere', 'en'), PRODUCTION_ORIGIN).href,
    'https://www.skloservis-brod.cz/en/glass-doors/',
  );
  assert.equal(pageUrl('contact', 'en', '/skloservis-brod/'), '/skloservis-brod/en/contact/');
});
