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

- `settings.yaml`: `name`, `contact_email` (email); required bilingual pairs `hero_title`, `hero_text`,
  `products_title`, `products_text`, `services_title`, `services_text`, `process`,
  `gallery_title`, `gallery_text`, `footer_text`, `seo_title`, `seo_description`.
  `seo_title` and `seo_description` describe the homepage. Other page titles/descriptions
  can use their matching editable heading/intro; product and contact descriptions
  have dedicated fields. The contact form uses FormSubmit with the validated contact email;
  changing that recipient requires its own activation and delivery verification.
- `contact.yaml`: `phone` (`+420` plus nine digits), `company_id` (eight-character digit
  string), `address`, `billing_address`; required bilingual pairs `title`, `text`,
  `enquiry_title`, `enquiry_text`, `seo_description`. Each address has required `street`,
  `city`, `postal_code` (`NNN NN`) and `country: CZ`. Email comes from settings.
  Required `map_url` is a valid HTTPS URL for the current Google Maps workshop profile.
  Optional `map_embed_url` accepts only `https://www.google.com/maps/embed?pb=`
  followed by the generated map payload; omission, `null` and `''` disable the embed.
  Obtain this URL from Google Maps Share → Embed a map and verify its pin before
  publishing; never invent a payload or assume an old embed still has the right location.
  Load the external iframe only after explicit visitor consent; keep the map link
  usable without JavaScript and do not add persistent consent storage.
  Optional `facebook_url` is the public page link `https://www.facebook.com/<page>/`; omission,
  `null` and `''` hide it. It renders as an ordinary link only: no SDK, embed, tracker or
  preconnect.
- `about.yaml`: required bilingual pairs `title`, `lead`, `body`; optional `photo`.
  Additional required fields:
  - `experience_years`: positive integer, seeded as `40`. Render as **over 40 years
    of glassworking experience**, never as the age of the present legal entity.
  - `metrics_title_cs/en`: `Náš rok v číslech` / `Our year in numbers` in the seed.
  - `metrics`: exactly four strict objects `{value, label_cs, label_en}`; `value`
    is a positive integer and both labels are nonblank. Seed order is `3000`
    completed orders, `300` complete projects, `100` tonnes of processed glass,
    `28000` km of ground glass edges. Render **over** or `+` for every figure;
    the numeric values and labels themselves contain neither. These are
    owner-confirmed annual figures, not a live counter or independently audited data.
  - `service_groups`: exactly four strict objects with unique `id` values
    `processing | doors | showers | structures`, required bilingual pairs `title`,
    `summary`, `text`, and `link`. Summary is the front-face copy; text supplies the
    details. Links are stable `PageId` values: `services` or one of the existing
    eight Czech service slugs. Resolve through `pageUrl` with language and base.
  - Bilingual pairs `special_glass_title`, `special_glass_text`, `consultation_title`,
    `consultation_text`. No specific resistance classes or certifications are implied.
    Optional `reputation` is a strict object `{source, url, rating, count, verified_on}`.
    Source is nonblank; URL must be an HTTPS Firmy.cz detail with ID `13749142`;
    rating is numeric in inclusive range `0..5`; count is a positive integer;
    verification date is a real `YYYY-MM-DD`. Omission, `null`, `''`, `{}` or an object
    containing only empty known child fields normalize to `undefined`. Partially
    filled objects and unknown keys fail. In Pages CMS, clear all five child fields
    to remove the rating. Do not default rating/count/date: that would prevent clearing.
    Display the source, count, date and profile link together. No award claims, logos
    or self-serving `aggregateRating` structured data.
    Optional `google_reputation` is a strict object `{url, rating, count, verified_on, reviews}`.
    URL must be `https://www.google.com/maps?cid=<digits>`; rating, count and date follow the
    same rules as above. Optional `reviews` holds at most four strict `{author, rating, text}`
    entries: nonblank author up to 40 characters (first name and initial), integer rating
    `1..5`, nonblank verbatim text up to 400 characters. Clearing every field, including an
    empty review list, removes the block. Copy values only from the public Google profile and
    record the check date; Google labels its reviews as not verified, so never present them
    as certified.
    `About` and `Contact` remain inferred from their collections; no additional getter
    or parallel manually maintained type is needed.
- `hours.yaml`: `holidays_closed` is a boolean (default false, seed true). Required `weekly` has exactly one row for each
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
  weekly row for that day, including notes and slots. When `holidays_closed` is true,
  Czech public holidays, including calculated Good Friday and Easter Monday, are closed.
  Explicit dated exceptions take precedence over holiday closure, then weekly hours apply.
- `banners.yaml`: ordered list of `{enabled, level, from?, to?, text_cs, text_en}`.
  `level` is `info | attention | warning`; text is required in both languages.
  Optional date bounds are inclusive, validated real dates, and must not be reversed.
  Blank bounds are unbounded. Both absent means permanent until disabled. Notices may
  overlap and do **not** change opening hours.
- `services.yaml`: exactly eight entries, each `{slug, slug_en, title_cs, title_en,
text_cs, text_en, details?, seo_description_cs, seo_description_en, image?}`. Every established
  Czech slug must occur once; English must match its fixed pair below.
  Keep `text_cs/en` as the short introduction used on product cards and detail pages.
  Optional `details` holds at most four strict `{title_cs, title_en, text_cs, text_en}`
  objects. Each field must be nonblank. Omission, `null` and `''` normalize to
  `undefined`; `[]` is valid. Delete the whole list item to remove a section; blank
  or partially translated items fail validation. Detail sections preserve list order
  and render as escaped headings and paragraphs in static HTML, only on product details.
  Restore only owner-confirmed product options; specifications are not certifications
  or universal performance guarantees. Pages CMS uses the same optional list and limit.
- `gallery.yaml`: list of `{image, alt_cs, alt_en, category, caption_cs?, caption_en?}`.
  `category` is one of the eight Czech service slugs or `vitriny`, `sklo-na-nabytek`,
  `zrcadla`, `krbova-skla`. These four gallery-only subjects do not create product routes.
  `src/lib/gallery.ts` exports the allowed categories and bilingual gallery-only labels;
  the CMS select must match this list. Required alt text describes the actual image.
  YAML order determines photo order and the first photo of each service remains its hero.
  The full gallery filters static HTML through category fragment links, also without JS.
  Its viewer follows only the selected category. Each service detail renders every photo
  in its category, with its hero included in the viewer but not repeated in the grid.
  Categories without photos show an empty message, never substitute another subject.

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
  `weekly | holiday | exception`; `row` contains slots/notes/assumption. Intervals are half-open:
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
verification of current operation. The owner subsequently confirmed Saturday, Sunday
and Czech public holidays closed, with phone/email available for arrangements.
These seed weekend rows are confirmed (`assumed: false`). No dated exception has been supplied.
Broad offerings follow pages 1388/1390 and product pages 1898/1942/1955/1971/1980/1990/
2003/2017. The owner confirmed on 2026-10-18 that the original business copy remains
substantially current, including coverage of the Zlín Region and other regions,
the four service groups and free planning, detailed quotation, advice and measuring.
The restored bilingual copy preserves that scope. The same owner explicitly
confirmed all four annual figures as **over** their stored values and updated the
glassworking experience to **over 40 years**. This is owner provenance, not an audit;
it does not alter the incorporation date of SKLOSERVIS-BROD s.r.o.

The [Firmy.cz profile](https://www.firmy.cz/detail/13749142-skloservis-brod-uhersky-brod.html)
was checked on 2026-10-18: rating **5.0 from 4 ratings**, operating address Prakšická 281
and IČO 02596491. It also lists insulating double/triple glazing, security,
bullet-resistant and fire-resistant glass. No specific classes, certification or
award were verified. Ratings are a dated snapshot; recheck the profile before updates.
Other profile fields do not override the separately confirmed enquiry recipient or
published hours. The Mapy.com firm ID is 13749142. The owner selected Google Maps for
the embedded map; its current profile shows Prakšická 281 and the matching telephone.

Pages CMS mirrors the new shapes using its documented
[number fields](https://pagescms.org/docs/configuration/fields/number/) and
[optional object fields](https://pagescms.org/docs/configuration/fields/object/).
The build remains authoritative for integer constraints, unique service-group IDs,
real calendar dates, nonblank copy and full URL validity. This data change alone
does not verify a live CMS save, new UI behavior, form delivery or production launch.

`createSchemas(imageSchema)` and `yamlItems(raw, shape)` are exported by the content
config for regression tests. The loader uses `js-yaml` `CORE_SCHEMA`, validates all
entries before replacing the store, and uses ordered synthetic IDs only internally.
