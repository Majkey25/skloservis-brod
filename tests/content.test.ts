import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CORE_SCHEMA, load } from 'js-yaml';
import { z } from 'astro/zod';
import { createSchemas, yamlItems } from '../src/content.config.ts';
import { GALLERY_CATEGORIES, isServiceCategory } from '../src/lib/gallery.ts';

const schemas = createSchemas(z.string().min(1));
const read = async (name: string): Promise<unknown> =>
  load(await readFile(new URL(`../src/data/${name}.yaml`, import.meta.url), 'utf8'), {
    schema: CORE_SCHEMA,
  });

test('seed content validates and preserves confirmed contacts and historical route identities', async () => {
  const settings = schemas.settings.parse(await read('settings'));
  const contact = schemas.contact.parse(await read('contact'));
  assert.equal(settings.contact_email, 'skloservis.brod@gmail.com');
  assert.equal(contact.phone, '+420608031206');
  assert.equal(contact.address.street, 'Prakšická 281');
  assert.equal(contact.billing_address.street, 'Březnice 314');
  assert.equal(contact.company_id, '02596491');
  schemas.about.parse(await read('about'));
  const hours = schemas.hours.parse(await read('hours'));
  assert.equal(hours.weekly.length, 7);
  for (const day of ['mon', 'tue', 'wed', 'thu']) {
    assert.deepEqual(hours.weekly.find((row) => row.day === day)?.slots, [
      { opens: '08:00', closes: '15:00' },
    ]);
  }
  assert.equal(hours.weekly.find((row) => row.day === 'fri')?.note_cs, 'Realizace montáží');
  assert.deepEqual(hours.weekly.find((row) => row.day === 'fri')?.slots, []);
  for (const day of ['sat', 'sun']) {
    assert.equal(hours.weekly.find((row) => row.day === day)?.assumed, false);
    assert.deepEqual(hours.weekly.find((row) => row.day === day)?.slots, []);
  }
  assert.equal(hours.holidays_closed, true);
  const services = schemas.services.parse(await read('services'));
  // Independent route inventory from the SEO report; changing both seed and schema must not rename URLs.
  assert.deepEqual(
    services.map(({ slug, slug_en }) => [slug, slug_en]),
    [
      ['sklenene-dvere', 'glass-doors'],
      ['sklenene-zabradli', 'glass-railings'],
      ['skleneny-sprchovy-kout', 'glass-shower-enclosures'],
      ['sklenena-stena', 'glass-partitions'],
      ['skleneny-obklad-do-kuchyne', 'glass-kitchen-splashbacks'],
      ['sklenene-strisky-zaskleni-pergol-zastreseni', 'glass-canopies-pergola-glazing'],
      ['sklenene-dekorace-gravirovani-fotek', 'glass-decorations-photo-engraving'],
      ['sklenene-nahrobni-desky', 'glass-memorial-plaques'],
    ],
  );
  schemas.banners.parse(await read('banners'));
  schemas.gallery.parse(await read('gallery'));
});

test('hours reject missing or duplicate days, invalid/overnight/overlapping slots and exceptions', async () => {
  const valid = schemas.hours.parse(await read('hours'));
  const rejected = (value: unknown) => assert.equal(schemas.hours.safeParse(value).success, false);
  rejected({ ...valid, weekly: valid.weekly.slice(1) });
  rejected({ ...valid, weekly: valid.weekly.map(() => valid.weekly[0]) });
  for (const slots of [
    [{ opens: '24:00', closes: '25:00' }],
    [{ opens: '15:00', closes: '08:00' }],
    [{ opens: '08:00', closes: '08:00' }],
    [
      { opens: '08:00', closes: '12:00' },
      { opens: '11:59', closes: '15:00' },
    ],
  ])
    rejected({ ...valid, weekly: valid.weekly.map((row) => ({ ...row, slots })) });
  for (const exceptions of [
    [{ from: '2026-02-30', to: '2026-03-01', slots: [] }],
    [{ from: '2026-12-31', to: '2026-12-24', slots: [] }],
    [{ from: '', to: '', slots: [] }],
    [
      { from: '2026-12-24', to: '2026-12-26', slots: [] },
      { from: '2026-12-26', to: '2026-12-27', slots: [] },
    ],
  ])
    rejected({ ...valid, exceptions });
  rejected({ ...valid, unexpected: true });
  assert.equal(
    schemas.hours.safeParse({
      ...valid,
      exceptions: [
        { from: '2024-02-29', to: '2024-02-29', slots: [] },
        { from: '2024-03-01', to: '2024-03-01', slots: [] },
      ],
    }).success,
    true,
  );
  rejected({
    ...valid,
    weekly: valid.weekly.map((row) => ({ ...row, assumed: true, note_cs: '', note_en: '' })),
  });
});

test('CMS blank optional dates normalize, notice dates/ranges and missing translations fail', () => {
  const notice = { enabled: true, level: 'info', text_cs: 'Zpráva', text_en: 'Notice' };
  const parsed = schemas.banner.parse({ ...notice, from: '', to: null });
  assert.equal(parsed.from, undefined);
  assert.equal(parsed.to, undefined);
  for (const patch of [
    { from: '2026-02-29' },
    { from: '2027-01-02', to: '2027-01-01' },
    { level: 'urgent' },
    { text_en: '' },
    { enabled: 'true' },
  ])
    assert.equal(schemas.banner.safeParse({ ...notice, ...patch }).success, false);
  const unquoted = load(
    'enabled: true\nlevel: info\nfrom: 2024-02-29\nto: 2024-02-29\ntext_cs: Zpráva\ntext_en: Notice',
    { schema: CORE_SCHEMA },
  );
  assert.equal(schemas.banner.parse(unquoted).from, '2024-02-29');
});

test('stable route pairs, gallery categories, strict keys and YAML file shapes are enforced', async () => {
  const services = schemas.services.parse(await read('services'));
  assert.equal(schemas.services.safeParse(services.slice(1)).success, false);
  assert.equal(schemas.services.safeParse(services.map(() => services[0])).success, false);
  assert.equal(
    schemas.service.safeParse({ ...services[0], slug_en: 'changed-url' }).success,
    false,
  );
  const gallery = {
    image: '../assets/gallery/real.jpg',
    alt_cs: 'Skleněné dveře',
    alt_en: 'Glass doors',
    category: 'sklenene-dvere',
    caption_cs: '',
    caption_en: null,
  };
  assert.equal(schemas.galleryItem.safeParse(gallery).success, true);
  assert.equal(schemas.galleryItem.safeParse({ ...gallery, category: 'made-up' }).success, false);
  assert.equal(schemas.galleryItem.safeParse({ ...gallery, alt_en: '' }).success, false);
  assert.equal(schemas.galleryItem.safeParse({ ...gallery, surprise: true }).success, false);
  assert.throws(() => yamlItems(null, 'singleton'));
  assert.throws(() => yamlItems([], 'singleton'));
  assert.throws(() => yamlItems({}, 'list'));
  assert.throws(() => yamlItems(['invalid'], 'list'));
  assert.deepEqual(yamlItems([], 'list'), []);
});

test('gallery-only subjects validate without product routes and CMS categories match the schema', async () => {
  const photo = { image: '../assets/gallery/real.jpg', alt_cs: 'Sklo', alt_en: 'Glass' };
  for (const category of GALLERY_CATEGORIES) {
    assert.equal(schemas.galleryItem.safeParse({ ...photo, category }).success, true);
  }
  for (const category of ['vitriny', 'sklo-na-nabytek', 'zrcadla', 'krbova-skla'] as const) {
    assert.equal(isServiceCategory(category), false);
  }
  assert.equal(isServiceCategory('sklenene-dvere'), true);
  assert.deepEqual(schemas.gallery.parse([]), []);

  const cms = z
    .object({
      content: z.array(
        z.object({
          name: z.string(),
          fields: z
            .array(z.object({ name: z.string(), options: z.unknown().optional() }))
            .optional(),
        }),
      ),
    })
    .parse(
      load(await readFile(new URL('../.pages.yml', import.meta.url), 'utf8'), {
        schema: CORE_SCHEMA,
      }),
    );
  const field = cms.content
    .find(({ name }) => name === 'gallery')
    ?.fields?.find(({ name }) => name === 'category');
  const { values } = z.object({ values: z.array(z.string()) }).parse(field?.options);
  assert.deepEqual([...values].sort(), [...GALLERY_CATEGORIES].sort());
});

test('service details allow CMS clearing but reject incomplete translations and excessive sections', async () => {
  const [service] = schemas.services.parse(await read('services'));
  const detail = {
    title_cs: 'Provedení',
    title_en: 'Options',
    text_cs: 'Popis provedení.',
    text_en: 'Description of the options.',
  };
  for (const details of [undefined, null, '']) {
    assert.equal(schemas.service.parse({ ...service, details }).details, undefined);
  }
  for (const details of [[], [detail], Array.from({ length: 4 }, () => detail)]) {
    assert.deepEqual(schemas.service.parse({ ...service, details }).details, details);
  }
  for (const field of Object.keys(detail)) {
    for (const value of [undefined, null, '', ' ', 8]) {
      assert.equal(
        schemas.service.safeParse({ ...service, details: [{ ...detail, [field]: value }] }).success,
        false,
      );
    }
  }
  for (const details of [
    {},
    [null],
    [{}],
    [{ ...detail, html: '<p>Unsupported markup field</p>' }],
    Array.from({ length: 5 }, () => detail),
  ]) {
    assert.equal(schemas.service.safeParse({ ...service, details }).success, false);
  }
});

test('CMS service details match the optional bounded bilingual content contract', async () => {
  const cms = z
    .object({
      content: z.array(
        z.object({
          name: z.string(),
          fields: z.array(z.looseObject({ name: z.string() })).optional(),
        }),
      ),
    })
    .parse(
      load(await readFile(new URL('../.pages.yml', import.meta.url), 'utf8'), {
        schema: CORE_SCHEMA,
      }),
    );
  const details = cms.content
    .find(({ name }) => name === 'services')
    ?.fields?.find(({ name }) => name === 'details');
  assert.ok(details);
  assert.equal(details.type, 'object');
  assert.notEqual(details.required, true);
  assert.deepEqual(details.list, { max: 4 });
  const fields = z
    .array(z.object({ name: z.string(), type: z.string(), required: z.boolean() }))
    .parse(details.fields);
  assert.deepEqual(
    fields.map(({ name, type, required }) => [name, type, required]),
    [
      ['title_cs', 'string', true],
      ['title_en', 'string', true],
      ['text_cs', 'text', true],
      ['text_en', 'text', true],
    ],
  );
});

test('company figures and service groups preserve owner-confirmed values and reject incomplete content', async () => {
  const about = schemas.about.parse(await read('about'));
  assert.equal(about.experience_years, 40);
  assert.deepEqual(
    about.metrics.map(({ value }) => value),
    [3000, 300, 100, 28000],
  );
  assert.deepEqual(
    about.service_groups.map(({ id }) => id),
    ['processing', 'doors', 'showers', 'structures'],
  );
  const rejected = (patch: Record<string, unknown>) =>
    assert.equal(schemas.about.safeParse({ ...about, ...patch }).success, false);
  for (const value of [-1, 0, 1.5, '3000']) {
    rejected({ metrics: about.metrics.map((row, i) => (i === 0 ? { ...row, value } : row)) });
  }
  rejected({ experience_years: -40 });
  rejected({ metrics: about.metrics.slice(1) });
  rejected({ metrics: about.metrics.map((row) => ({ ...row, label_en: ' ' })) });
  rejected({ service_groups: about.service_groups.slice(1) });
  rejected({ service_groups: about.service_groups.map(() => about.service_groups[0]) });
  for (const patch of [
    { link: 'invented-route' },
    { link: 'https://example.com' },
    { summary_en: '' },
    { id: 'other' },
  ]) {
    rejected({
      service_groups: about.service_groups.map((row, i) => (i === 0 ? { ...row, ...patch } : row)),
    });
  }
  rejected({ special_glass_text_en: '' });
  rejected({ consultation_text_cs: '' });
});

test('reputation validates source, rating bounds and real dates while allowing CMS clearing', async () => {
  const about = schemas.about.parse(await read('about'));
  // A fixed sample keeps these checks valid when editors update or clear the live rating.
  const firmy = {
    source: 'Firmy.cz / Mapy.com',
    url: 'https://www.firmy.cz/detail/13749142-skloservis-brod-uhersky-brod.html',
    rating: 5,
    count: 4,
    verified_on: '2026-10-18',
  };
  assert.equal(schemas.about.parse({ ...about, reputation: firmy }).reputation?.count, 4);
  for (const patch of [
    { rating: -0.1 },
    { rating: 5.1 },
    { rating: '5' },
    { count: 0 },
    { count: 1.5 },
    { verified_on: '2026-02-29' },
    { verified_on: '2026-04-31' },
    { source: '' },
    { url: 'https://www.firmy.cz/detail/123-other.html' },
    { url: 'https://www.firmy.cz.evil.example/detail/13749142-skloservis-brod.html' },
    { award: 'unverified' },
  ]) {
    assert.equal(
      schemas.about.safeParse({ ...about, reputation: { ...firmy, ...patch } }).success,
      false,
    );
  }
  for (const rating of [0, 4.9, 5]) {
    assert.equal(
      schemas.about.safeParse({
        ...about,
        reputation: { ...firmy, rating, verified_on: '2024-02-29' },
      }).success,
      true,
    );
  }
  for (const reputation of [
    undefined,
    null,
    '',
    {},
    { source: '', url: null, rating: null, count: null, verified_on: '' },
  ]) {
    assert.equal(schemas.about.parse({ ...about, reputation }).reputation, undefined);
  }
  for (const reputation of [{ source: 'Firmy.cz' }, { unknown: '' }]) {
    assert.equal(schemas.about.safeParse({ ...about, reputation }).success, false);
  }
});

test('Google reputation validates the profile link, bounds, quoted reviews and CMS clearing', async () => {
  const about = schemas.about.parse(await read('about'));
  // A fixed sample keeps these checks valid when editors update or clear the live rating.
  const review = { author: 'Jana N.', rating: 5, text: 'Rychlá a pečlivá práce.' };
  const google = {
    url: 'https://www.google.com/maps?cid=1666475050247901811',
    rating: 4.6,
    count: 36,
    verified_on: '2026-10-18',
    reviews: [review],
  };
  assert.equal(
    schemas.about.parse({ ...about, google_reputation: google }).google_reputation?.reviews?.length,
    1,
  );
  for (const patch of [
    { url: 'https://www.google.com/maps/place/skloservis' },
    { url: 'https://www.google.com.evil.example/maps?cid=1' },
    { rating: 5.1 },
    { rating: '4.6' },
    { count: 0 },
    { verified_on: '2026-02-30' },
    { reviews: [{ ...review, rating: 6 }] },
    { reviews: [{ ...review, rating: 4.5 }] },
    { reviews: [{ ...review, author: '' }] },
    { reviews: [{ ...review, text: 'x'.repeat(401) }] },
    { reviews: [{ ...review, date: '2020-01-01' }] },
    { reviews: Array.from({ length: 5 }, () => review) },
    { award: 'unverified' },
  ]) {
    assert.equal(
      schemas.about.safeParse({ ...about, google_reputation: { ...google, ...patch } }).success,
      false,
    );
  }
  assert.deepEqual(
    schemas.about.parse({ ...about, google_reputation: { ...google, reviews: null } })
      .google_reputation?.reviews,
    undefined,
  );
  for (const google_reputation of [
    undefined,
    null,
    '',
    {},
    { url: '', rating: null, count: null, verified_on: '', reviews: [] },
  ]) {
    assert.equal(schemas.about.parse({ ...about, google_reputation }).google_reputation, undefined);
  }
  assert.equal(
    schemas.about.safeParse({ ...about, google_reputation: { url: google.url } }).success,
    false,
  );
});

test('the optional Facebook link accepts only a public facebook.com page URL', async () => {
  const contact = schemas.contact.parse(await read('contact'));
  for (const facebook_url of [undefined, null, '']) {
    assert.equal(schemas.contact.parse({ ...contact, facebook_url }).facebook_url, undefined);
  }
  for (const facebook_url of [
    'https://www.facebook.com/skloservisbrod/',
    'https://www.facebook.com/skloservisbrod',
  ]) {
    assert.equal(schemas.contact.safeParse({ ...contact, facebook_url }).success, true);
  }
  for (const facebook_url of [
    'http://www.facebook.com/skloservisbrod/',
    'https://www.facebook.com.evil.example/skloservisbrod/',
    'https://www.facebook.com/plugins/page.php?href=x',
    'https://example.com/skloservisbrod/',
  ]) {
    assert.equal(schemas.contact.safeParse({ ...contact, facebook_url }).success, false);
  }
});

test('map links require HTTPS and embeds accept only the official generated host and path', async () => {
  const contact = schemas.contact.parse(await read('contact'));
  assert.match(contact.map_url, /^https:\/\/www\.google\.com\/maps/);
  for (const map_embed_url of [undefined, null, '']) {
    assert.equal(schemas.contact.parse({ ...contact, map_embed_url }).map_embed_url, undefined);
  }
  // This token only tests the accepted URL shape, not a live map or a verified location.
  assert.equal(
    schemas.contact.safeParse({
      ...contact,
      map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1stest%20map',
    }).success,
    true,
  );
  for (const map_embed_url of [
    'https://example.com/s/abc123',
    'http://www.google.com/maps/embed?pb=!1m18',
    'https://www.google.com.evil.example/maps/embed?pb=!1m18',
    'https://www.google.com@evil.example/maps/embed?pb=!1m18',
    'https://www.google.com/maps/embed?pb=',
    'https://www.google.com/maps/other?pb=!1m18',
    'https://www.google.com/maps/embed?pb=!1m18&redirect=https://example.com',
  ]) {
    assert.equal(schemas.contact.safeParse({ ...contact, map_embed_url }).success, false);
  }
  for (const map_url of ['http://mapy.com', 'javascript:alert(1)', 'https://']) {
    assert.equal(schemas.contact.safeParse({ ...contact, map_url }).success, false);
  }
});
