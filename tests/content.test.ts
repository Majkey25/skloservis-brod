import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CORE_SCHEMA, load } from 'js-yaml';
import { z } from 'astro/zod';
import { createSchemas, yamlItems } from '../src/content.config.ts';

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
    assert.equal(hours.weekly.find((row) => row.day === day)?.assumed, true);
  }
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
