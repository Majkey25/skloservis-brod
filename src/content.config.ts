import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineCollection } from 'astro/content/config';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { CORE_SCHEMA, load } from 'js-yaml';
import { isCalendarDate, WEEKDAYS } from './lib/schedule.ts';
import { SERVICE_ROUTES } from './lib/urls.ts';

const slugs = Object.keys(SERVICE_ROUTES) as [
  keyof typeof SERVICE_ROUTES,
  ...Array<keyof typeof SERVICE_ROUTES>,
];
const text = z.string().trim().min(1);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === null || value === '' ? undefined : value), schema.optional());
const date = z.string().refine(isCalendarDate, 'Use a real calendar date: YYYY-MM-DD');
const httpsUrl = z.url().regex(/^https:\/\//, 'Use an HTTPS URL');
const mapEmbedUrl = httpsUrl.regex(
  /^https:\/\/www\.google\.com\/maps\/embed\?pb=[A-Za-z0-9!%._-]+$/,
  'Use the Google Maps Share > Embed a map URL (https://www.google.com/maps/embed?pb=...)',
);
const reputationFields = {
  source: text,
  url: httpsUrl.regex(/^https:\/\/(www\.)?firmy\.cz\/detail\/13749142-[a-z0-9-]+\.html$/),
  rating: z.number().min(0).max(5),
  count: z.number().int().positive(),
  verified_on: date,
};
const reputation = z.preprocess(
  (value) => {
    // Pages CMS can serialize a cleared optional object as empty child fields.
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.entries(value).every(
        ([key, field]) =>
          Object.hasOwn(reputationFields, key) &&
          (field == null || (typeof field === 'string' && field.trim() === '')),
      )
    )
      return undefined;
    return value;
  },
  optional(z.strictObject(reputationFields)),
);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
const slot = z
  .strictObject({ opens: time, closes: time })
  .refine(
    (row) => row.opens < row.closes,
    'Opening time must precede closing time; no overnight intervals',
  );
const slots = z.array(slot).superRefine((rows, ctx) => {
  const ordered = [...rows].sort((a, b) => a.opens.localeCompare(b.opens));
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i]!.opens < ordered[i - 1]!.closes) {
      ctx.addIssue({ code: 'custom', message: 'Opening intervals overlap' });
    }
  }
});
const emptyList = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === null || value === undefined ? [] : value), z.array(schema));
const dayFields = {
  slots: emptyList(slot).pipe(slots),
  note_cs: optional(text),
  note_en: optional(text),
  assumed: z.boolean().default(false),
};
const dayNotes = (row: { assumed: boolean; note_cs?: string; note_en?: string }) =>
  (!row.assumed || Boolean(row.note_cs && row.note_en)) &&
  Boolean(row.note_cs) === Boolean(row.note_en);
const weeklyDay = z
  .strictObject({ day: z.enum(WEEKDAYS), ...dayFields })
  .refine(dayNotes, 'Notes must be bilingual; assumptions need explicit notes in both languages');
const exception = z
  .strictObject({ from: date, to: date, ...dayFields })
  .refine((row) => row.from <= row.to, 'Exception date range is reversed')
  .refine(dayNotes, 'Notes must be bilingual; assumptions need explicit notes in both languages');
const address = z.strictObject({
  street: text,
  city: text,
  postal_code: z.string().regex(/^\d{3} \d{2}$/),
  country: z.literal('CZ'),
});

/** Image schema is injected so Node tests use the same contract without the Astro asset runtime. */
export const createSchemas = <T extends z.ZodType>(image: T) => {
  const settings = z.strictObject({
    name: text,
    contact_email: z.email(),
    hero_title_cs: text,
    hero_title_en: text,
    hero_text_cs: text,
    hero_text_en: text,
    products_title_cs: text,
    products_title_en: text,
    products_text_cs: text,
    products_text_en: text,
    services_title_cs: text,
    services_title_en: text,
    services_text_cs: text,
    services_text_en: text,
    process_cs: text,
    process_en: text,
    gallery_title_cs: text,
    gallery_title_en: text,
    gallery_text_cs: text,
    gallery_text_en: text,
    footer_text_cs: text,
    footer_text_en: text,
    seo_title_cs: text,
    seo_title_en: text,
    seo_description_cs: text,
    seo_description_en: text,
  });
  const contact = z.strictObject({
    phone: z.string().regex(/^\+420\d{9}$/),
    address,
    billing_address: address,
    company_id: z.string().regex(/^\d{8}$/),
    map_url: httpsUrl,
    map_embed_url: optional(mapEmbedUrl),
    title_cs: text,
    title_en: text,
    text_cs: text,
    text_en: text,
    enquiry_title_cs: text,
    enquiry_title_en: text,
    enquiry_text_cs: text,
    enquiry_text_en: text,
    seo_description_cs: text,
    seo_description_en: text,
  });
  const about = z.strictObject({
    title_cs: text,
    title_en: text,
    lead_cs: text,
    lead_en: text,
    body_cs: text,
    body_en: text,
    photo: optional(image),
    experience_years: z.number().int().positive(),
    metrics_title_cs: text,
    metrics_title_en: text,
    metrics: z
      .array(z.strictObject({ value: z.number().int().positive(), label_cs: text, label_en: text }))
      .length(4),
    service_groups: z
      .array(
        z.strictObject({
          id: z.enum(['processing', 'doors', 'showers', 'structures']),
          title_cs: text,
          title_en: text,
          summary_cs: text,
          summary_en: text,
          text_cs: text,
          text_en: text,
          link: z.enum(['services', ...slugs]),
        }),
      )
      .length(4)
      .refine(
        (rows) => new Set(rows.map((row) => row.id)).size === 4,
        'Include each service group exactly once',
      ),
    special_glass_title_cs: text,
    special_glass_title_en: text,
    special_glass_text_cs: text,
    special_glass_text_en: text,
    consultation_title_cs: text,
    consultation_title_en: text,
    consultation_text_cs: text,
    consultation_text_en: text,
    reputation,
  });
  const hours = z
    .strictObject({
      holidays_closed: z.boolean().default(false),
      weekly: z
        .array(weeklyDay)
        .length(7)
        .refine(
          (rows) => new Set(rows.map((row) => row.day)).size === 7,
          'Each weekday must appear exactly once',
        ),
      exceptions: emptyList(exception).superRefine((rows, ctx) => {
        const ordered = [...rows].sort((a, b) => a.from.localeCompare(b.from));
        for (let i = 1; i < ordered.length; i++) {
          if (ordered[i]!.from <= ordered[i - 1]!.to) {
            ctx.addIssue({ code: 'custom', message: 'Inclusive exception date ranges overlap' });
          }
        }
      }),
      note_cs: optional(text),
      note_en: optional(text),
    })
    .refine(
      (row) => Boolean(row.note_cs) === Boolean(row.note_en),
      'Hours notes must be bilingual',
    );
  const banner = z
    .strictObject({
      enabled: z.boolean(),
      level: z.enum(['info', 'attention', 'warning']),
      from: optional(date),
      to: optional(date),
      text_cs: text,
      text_en: text,
    })
    .refine((row) => !row.from || !row.to || row.from <= row.to, 'Notice date range is reversed');
  const service = z
    .strictObject({
      slug: z.enum(slugs),
      slug_en: text,
      title_cs: text,
      title_en: text,
      text_cs: text,
      text_en: text,
      seo_description_cs: text,
      seo_description_en: text,
      image: optional(image),
    })
    .refine(
      (row) => SERVICE_ROUTES[row.slug] === row.slug_en,
      'Keep the established Czech/English route pair',
    );
  const services = z
    .array(service)
    .length(8)
    .refine(
      (rows) => new Set(rows.map((row) => row.slug)).size === 8,
      'Include every established service exactly once',
    );
  const galleryItem = z.strictObject({
    image,
    alt_cs: text,
    alt_en: text,
    category: z.enum(slugs),
    caption_cs: optional(text),
    caption_en: optional(text),
  });
  return {
    settings,
    contact,
    about,
    hours,
    banner,
    banners: z.array(banner),
    service,
    services,
    galleryItem,
    gallery: z.array(galleryItem),
  };
};

export const yamlItems = (raw: unknown, shape: 'singleton' | 'list'): Record<string, unknown>[] => {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  if (shape === 'singleton') {
    if (!isRecord(raw)) throw new Error('Required singleton YAML must contain an object');
    return [raw];
  }
  if (!Array.isArray(raw) || !raw.every(isRecord))
    throw new Error('List YAML must contain an array of objects (use [] for empty)');
  return raw;
};

/** CORE_SCHEMA preserves dates as strings. Parse everything before replacing the current store. */
const yamlFile = (
  file: string,
  shape: 'singleton' | 'list',
  validate?: (items: Record<string, unknown>[]) => void,
): Loader => ({
  name: `yaml:${file}`,
  load: async ({ config, store, parseData, logger, watcher }) => {
    const path = fileURLToPath(new URL(file, config.root));
    const sync = async () => {
      const items = yamlItems(
        load(await readFile(path, 'utf8'), { schema: CORE_SCHEMA, filename: file }),
        shape,
      );
      validate?.(items);
      const entries = await Promise.all(
        items.map(async (data, i) => {
          const id = shape === 'singleton' ? 'main' : String(i).padStart(6, '0');
          return { id, filePath: file, data: await parseData({ id, data, filePath: file }) };
        }),
      );
      store.clear();
      entries.forEach((entry) => store.set(entry));
    };
    await sync();
    watcher?.add(path);
    const refresh = (changed: string) => {
      if (changed === path)
        void sync().catch((error: unknown) =>
          logger.error(error instanceof Error ? error.message : String(error)),
        );
    };
    watcher?.on('change', refresh);
    watcher?.on('add', refresh);
    watcher?.on('unlink', refresh);
  },
});

const plain = createSchemas(text);
export const collections = {
  settings: defineCollection({
    loader: yamlFile('src/data/settings.yaml', 'singleton'),
    schema: plain.settings,
  }),
  contact: defineCollection({
    loader: yamlFile('src/data/contact.yaml', 'singleton'),
    schema: plain.contact,
  }),
  about: defineCollection({
    loader: yamlFile('src/data/about.yaml', 'singleton'),
    schema: ({ image }) => createSchemas(image()).about,
  }),
  hours: defineCollection({
    loader: yamlFile('src/data/hours.yaml', 'singleton'),
    schema: plain.hours,
  }),
  banners: defineCollection({
    loader: yamlFile('src/data/banners.yaml', 'list'),
    schema: plain.banner,
  }),
  services: defineCollection({
    loader: yamlFile('src/data/services.yaml', 'list', (items) => {
      plain.services.parse(items);
    }),
    schema: ({ image }) => createSchemas(image()).service,
  }),
  gallery: defineCollection({
    loader: yamlFile('src/data/gallery.yaml', 'list'),
    schema: ({ image }) => createSchemas(image()).galleryItem,
  }),
};
