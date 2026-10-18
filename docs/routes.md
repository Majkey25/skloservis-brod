# Route and URL foundation

`src/lib/urls.ts` is a pure TypeScript module usable in Node 24, Astro and browser code.
It imports neither Astro content configuration nor environment variables. No dependencies were added.

The initial route inventory preserves 14 historical Czech paths with their planned English equivalents.
Czech remains at the root, English under `/en/`, and every path ends in `/`.
The English paths are implemented equivalents; final translation approval remains a launch task.
The inventory is a minimum baseline, not a verified complete inventory of live URLs or aliases.

## Exports

- `PRODUCTION_ORIGIN`: `https://www.skloservis-brod.cz`, retained for future authorized production use.
- `SERVICE_ROUTES`: the eight stable Czech service slugs mapped to their English slugs, without slashes.
- `ROUTES`: the 14 historical pairs plus cookies and company/legal pages, as `{ id, cs, en }` entries without any deployment base.
  Future `getStaticPaths`, navigation and production sitemap code should consume this same list.
- `pageUrl(page: PageId, language: Language = 'cs', base = '/'): string`:
  returns a local path with the deployment base and trailing slash. An unknown runtime page ID throws
  `RangeError`; TypeScript callers must use `PageId`.
- `equivalentLanguageUrl(pathname: string, language: Language, base = '/'): string | undefined`:
  matches the current page in either language and returns that page's requested language URL.
  The same language returns its own normalized link. Unknown paths or paths outside the base return
  `undefined`, so callers can omit an unavailable switch instead of silently linking to the homepage.
- Types: `Language` (`'cs' | 'en'`), `ServiceSlug` (keys of `SERVICE_ROUTES`), `PageId` and `PageRoute`.

Main page IDs are `home`, `products`, `services`, `gallery`, `contact`, `privacy`, `cookies` and `legal`.
Service page IDs are their stable Czech slugs, for example `sklenene-dvere`.
Editable titles and Astro collection entry IDs must not determine URLs.

## Base and pathname contract

Pass the actual `import.meta.env.BASE_URL` explicitly at the Astro/browser call site.
The default `/` is suitable for root hosting and future production URL generation; it does not infer
the current deployment. The inspected `astro.config.mjs` uses `/skloservis-brod` for the Pages preview,
matching the corrected repository name `Majkey25/skloservis-brod` despite the older local folder name.

Empty or slash-only bases normalize to `/`. Leading, repeated and trailing base slashes normalize:
`skloservis-brod`, `/skloservis-brod/` and `//skloservis-brod///` all mean `/skloservis-brod/`.
Nested bases such as `//preview///site//` normalize to `/preview/site/`.
Bases containing a host/scheme, query, fragment, backslash, whitespace or literal `.`/`..` segments
throw `TypeError`. Base matching uses the entire path prefix including its segment boundary.

Pass `URL.pathname` (for example `Astro.url.pathname` or `window.location.pathname`) to the equivalent
helper, not a full URL, query string or fragment. It accepts a known path with or without the final
slash and always emits the mapped trailing slash. It does not decode paths, collapse repeated slashes
in the current pathname, translate fragments, or preserve query strings. This lookup behavior does
not install redirects or establish historical aliases.

```ts
import { equivalentLanguageUrl, pageUrl, PRODUCTION_ORIGIN } from '../lib/urls.ts';

pageUrl('contact', 'cs', '/skloservis-brod');
// /skloservis-brod/kontakt/

equivalentLanguageUrl('/skloservis-brod/sklenene-dvere/', 'en', '/skloservis-brod/');
// /skloservis-brod/en/glass-doors/

equivalentLanguageUrl('/skloservis-brod/unknown/', 'en', '/skloservis-brod/');
// undefined

// Future production generation only: leave out the preview base.
new URL(pageUrl('sklenene-dvere', 'en'), PRODUCTION_ORIGIN).href;
// https://www.skloservis-brod.cz/en/glass-doors/
```

## Content validation

`src/content.config.ts` imports `SERVICE_ROUTES` from this pure module. Content validation and URL
generation therefore share one stable map. The eight service page pairs derive from that map.
Browser code must import this module, never the content loader.

## Adding pages

Add a non-service page as another `{ id, cs, en }` entry in `MAIN_ROUTES`, retaining `as const`.
`PageId` and `ROUTES` derive from it automatically; both helpers immediately support the new pair.
Keep IDs and localized paths unique, with root Czech paths, English `/en/` paths and trailing slashes.
Creating the actual page and checking its translated content remain separate implementation work.

The independent `HISTORICAL_PAIRS` fixture in `tests/urls.test.ts` fixes exactly the original 14 pairs.
It requires every original pair to remain unchanged without limiting the total inventory to 14.
Additional legal/company/cookie/consumer pages therefore need no historical fixture changes.
Uniqueness, slash and reciprocal-link tests cover every entry, including additions. Neither runtime
code nor tests read private research files or local source archives.

## SEO build targets

`astro.config.mjs` selects the site, base and metadata target together from one optional variable,
`SITE_BUILD_TARGET`. Unset means `preview`; invalid values fail. Normal `npm run build`, `npm run dev`
and Astro's default `production` mode remain preview builds at
`https://majkey25.github.io/skloservis-brod/`. `NODE_ENV` does not enable indexing.

Astro 7.4.0's installed CLI accepts `--mode`, but its config loader accepts an object and does not
pass that mode to the config or `astro:config:setup`. The explicit target variable avoids parsing
CLI arguments or introducing separate site/base/indexing switches. Config injects the resolved
target into templates and endpoints. Both the resolved Astro config and renderers reject a site
or base that differs from the selected trusted target, including credentials, queries and fragments.

Every preview HTML page, including 404, has initial `noindex, follow`. Preview pages omit canonical,
hreflang, `og:url` and business JSON-LD. Preview `robots.txt` permits crawling so bots can read
`noindex`, and has no sitemap reference; `sitemap.xml` is an empty XML urlset with no URLs.
On GitHub Pages these files live below the repository base; HTML `noindex` is the exclusion mechanism.

Future local production preparation requires `SITE_BUILD_TARGET=production` in the build process's
environment. Keep that opt-in separate from normal development and preview publication.

This writes only to ignored `.reference/build-production/`, separate from the preview `dist/`
artifact. GitHub Actions refuses this target; it can only build previews. Do not upload the
production preparation output or attach a domain without a separately authorized cutover.
No CNAME, WordPress, production hosting or DNS changes are part of this implementation.

Production uses `https://www.skloservis-brod.cz` at `/`. Each known localized page has a self
canonical, reciprocal `cs`/`en` alternates and an `x-default` pointing to the pair's Czech page.
The initial language bootstrap automatically redirects only an explicit preview build.
Production Czech `/` remains Czech regardless of device locale or saved English choice;
explicit English URLs and manual preference persistence remain available.
Metadata resolves the actual pathname and document language, not the shell's page identity;
404 and unknown paths stay `noindex` without canonical, alternates or business schema.
The production sitemap includes all `ROUTES` pairs and excludes 404, with no invented `lastmod`.
Production robots allows crawling and references the absolute sitemap URL.

Only production contact pages emit one stable `LocalBusiness` identity from `getSettings`,
`getContact` and `getHours`. Address is the operating address; billing is not another branch.
No reviews, ratings, coordinates, certifications or unverified images are invented. Numeric hours
exclude assumed rows and rows without visiting intervals, including the current installation-only
Friday. Explicit future Friday visiting intervals remain editable. When any dated exception exists or Czech holiday closure is enabled, structured hours are omitted
conservatively; the complete visible Prague-aware schedule remains authoritative. Empty slots do
not assert closure. JSON-LD escapes `<` so editable text cannot close the data script.

## Scope and verification

These build targets prepare metadata; they do not authorize production publication, establish
HTTP redirects, verify owner accounts, prove search indexing or guarantee rankings. Launch still
requires route/media/alias inventory, approved translations, real hosting status/redirect checks
and structured-data review against the final visible facts.

Run `node --test tests/urls.test.ts` for focused tests. The repository's inspected test script is
`node --test tests/*.test.ts`; `npm run check` runs `astro check`. Node tests verify exact historical pairs,
uniqueness, service identities, normalized bases, trailing slashes, reciprocal deep links and unknown
paths. They do not establish HTTP status, translation completeness, rendered metadata or deployment
readiness. `node --test tests/seo.test.ts` additionally verifies the actual config's default and
explicit target, the Actions guard, trusted origin/base rejection, preview exclusions, all
production canonical/alternate pairs, sitemap/robots, 404 handling and CMS-derived schema.
The lead owns final integrated Astro/build/browser and public deployment verification.
