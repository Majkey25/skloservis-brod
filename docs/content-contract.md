# Content contract

All business copy is plain text, paired `_cs` / `_en`, editable through `.pages.yml`.
Render it as escaped text; split `about.body_*` on blank lines for paragraphs. Interface
labels and layout remain frontend responsibilities. Czech routes retain their historic
unprefixed paths; English uses `/en/`. Do not generate slugs from titles.

## Frontend exports

`src/content.ts` exports these asynchronous functions, each returning validated data
(without collection IDs):

- `getSettings(): Promise<Settings>`
- `getContact(): Promise<Contact>`
- `getAbout(): Promise<About>`
- `getHours(): Promise<OpeningHours>`
- `getNotices(): Promise<Banner[]>`
- `getServices(): Promise<Service[]>`
- `getGallery(): Promise<GalleryItem[]>`

The seven named return types are also exported. Lists preserve YAML order. Singletons
must contain exactly one mapping. Empty lists must be `[]`; empty singleton files fail.
Gallery, service and about images resolve through Astro `image()` to image metadata
for `astro:assets`. Paths in YAML are relative to `src/data`, normally
`../assets/gallery/filename.jpg`. A CMS upload still needs a content row.

`getHours()` returns **all** exceptions. `getNotices()` returns **all** notices, including
disabled, future and expired records. Pass their complete public data to the browser;
do not filter them away at build time. Import only `src/lib/schedule.ts` into browser
code, never the Node/Astro content loader.

## YAML schemas

Objects reject unknown keys. Required strings must be nonblank. Optional string,
date and image fields normalize CMS `''` / `null` to `undefined`. Missing/null nested
slot and exception lists normalize to `[]`. Booleans are actual booleans.

- `settings.yaml`: `name`, `contact_email` (email), `relay_ready: false`,
  `relay_provider: unconfigured`; required bilingual pairs `hero_title`, `hero_text`,
  `products_title`, `products_text`, `services_title`, `services_text`, `process`,
  `gallery_title`, `gallery_text`, `footer_text`, `seo_title`, `seo_description`.
  `seo_title` and `seo_description` describe the homepage. Other page titles/descriptions
  can use their matching editable heading/intro; product and contact descriptions
  have dedicated fields. No form relay or endpoint is configured.
- `contact.yaml`: `phone` (`+420` plus nine digits), `company_id` (eight-character digit
  string), `address`, `billing_address`; required bilingual pairs `title`, `text`,
  `enquiry_title`, `enquiry_text`, `seo_description`. Each address has required `street`,
  `city`, `postal_code` (`NNN NN`) and `country: CZ`. Email comes from settings.
- `about.yaml`: required bilingual pairs `title`, `lead`, `body`; optional `photo`.
- `hours.yaml`: required `weekly` with exactly one row for each
  `mon,tue,wed,thu,fri,sat,sun`; optional `exceptions`; optional bilingual `note`.
  A weekly row has `day`, `slots`, optional bilingual `note`, `assumed` (default false).
  An exception has required `from`, `to`, plus the same `slots`, `note`, `assumed` fields.
  If `assumed` is true, both notes must explain the assumption. Notes on any hours row
  must be supplied in both languages or neither.
- Each slot has `opens`, `closes` as zero-padded `HH:MM`. Require `opens < closes`;
  overlapping intervals fail. Adjacent intervals are allowed, and input order is not
  significant. No overnight or 24-hour intervals. Empty slots mean **no published
  walk-in interval**; show the row's notes, especially for installation-only Fridays.
- Exceptions use real `YYYY-MM-DD` dates (years 0001–9999), both required. Bounds are
  inclusive; reversed or overlapping ranges fail. An exception replaces the entire
  weekly row for that day, including notes and slots. No holiday closure is inferred.
- `banners.yaml`: ordered list of `{enabled, level, from?, to?, text_cs, text_en}`.
  `level` is `info | attention | warning`; text is required in both languages.
  Optional date bounds are inclusive, validated real dates, and must not be reversed.
  Blank bounds are unbounded. Both absent means permanent until disabled. Notices may
  overlap and do **not** change opening hours.
- `services.yaml`: exactly eight entries, each `{slug, slug_en, title_cs, title_en,
text_cs, text_en, seo_description_cs, seo_description_en, image?}`. Every established
  Czech slug must occur once; English must match its fixed pair below.
- `gallery.yaml`: list of `{image, alt_cs, alt_en, category, caption_cs?, caption_en?}`.
  `category` is one of the eight Czech service slugs. Required alt text describes the
  actual image. The initial gallery is empty for the parent's curated media import.

Stable pairs, exported as `SERVICE_ROUTES` from `src/content.config.ts`:

```text
sklenene-dvere                                  glass-doors
sklenene-zabradli                               glass-railings
skleneny-sprchovy-kout                          glass-shower-enclosures
sklenena-stena                                 glass-partitions
skleneny-obklad-do-kuchyne                      glass-kitchen-splashbacks
sklenene-strisky-zaskleni-pergol-zastreseni      glass-canopies-pergola-glazing
sklenene-dekorace-gravirovani-fotek              glass-decorations-photo-engraving
sklenene-nahrobni-desky                         glass-memorial-plaques
```

## Shared schedule API

`src/lib/schedule.ts` has no Astro, Zod, filesystem or DOM dependency. Node 24 can run
it with native TypeScript stripping. It exports:

- `BUSINESS_TIME_ZONE = 'Europe/Prague'`, `WEEKDAYS` (Monday first).
- Types `Weekday`, `Slot`, `DayHours`, `WeeklyHours`, `ExceptionHours`, `Hours`, `Notice`.
- `isCalendarDate(value: string): boolean`.
- `businessClock(instant: Date): {date, time, day}`; invalid instants throw `RangeError`.
- `dateInRange(date, {from?, to?}): boolean`, inclusive, for already validated dates.
- `activeNotices(notices, instant)`: enabled notices within local date bounds, ordered
  warning → attention → info, then original file order. Does not mutate input.
- `scheduleAt(hours, instant)`: `{date, time, day, source, row, isOpen}`; `source` is
  `weekly | exception`; `row` contains slots/notes/assumption. Intervals are half-open:
  open at `opens`, closed at `closes`. Missing weekday throws instead of implying closed.

All inputs to runtime predicates must already be schema validated. Pass a fresh
`new Date()` on load, `pageshow`, visibility return and periodically while visible.
Recompute local time rather than adding 24 hours or assuming a fixed UTC offset.
Do not present build-time `isOpen` as live status. `isOpen: false` for installation-only
or assumed rows does not establish that the whole business is closed. Display notes,
and omit assumed hours and Friday installation work from numeric structured hours.
Device time may be wrong; there is no authoritative clock service. All scheduled
content is public before its activation date. Prerender ordinary hours and dated notes
as a no-JavaScript fallback, with the assumptions visible.

## Source and outstanding confirmation

Seed copy paraphrases the published [business website](https://www.skloservis-brod.cz/).
Identity, operating address Prakšická 281,
phone +420 608 031 206, billing address Březnice 314 and IČO 02596491 follow page **1393**.
The owner confirmed `skloservis.brod@gmail.com` on 2026-10-17. Obsolete privacy-page
address/phone have not been reused. This content does not replace a reviewed privacy
notice or authorize a mail service.

Po–Čt 08:00–15:00 and Friday “Realizace montáží” are archived source facts, not a fresh
verification of current operation. Weekend hours are unconfirmed; show the bilingual
instruction to call, never an asserted closure. The `assumed` flag records that uncertainty
for renderers and structured data. No dated exception has been supplied.
Broad offerings follow pages 1388/1390 and product pages 1898/1942/1955/1971/1980/1990/
2003/2017. Translations preserve that meaning. Current product availability, specific
glass thicknesses/certifications, coverage and commercial terms remain unverified;
technical specifications, free-service claims, ratings, metrics and “over 30 years”
are omitted. CMS access, save/build/deploy, form delivery and production launch are
outside this foundation's verification.

`createSchemas(imageSchema)` and `yamlItems(raw, shape)` are exported by the content
config for regression tests. The loader uses `js-yaml` `CORE_SCHEMA`, validates all
entries before replacing the store, and uses ordered synthetic IDs only internally.
