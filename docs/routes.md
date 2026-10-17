# Route and URL foundation

`src/lib/urls.ts` is a pure TypeScript module usable in Node 24, Astro and browser code.
It imports neither Astro content configuration nor environment variables. No dependencies were added.

The initial route inventory preserves 14 historical Czech paths with their planned English equivalents.
Czech remains at the root, English under `/en/`, and every path ends in `/`.
The English paths are proposed equivalents, not evidence of published or approved translations.
The inventory is a minimum baseline, not a verified complete inventory of live URLs or aliases.

## Exports

- `PRODUCTION_ORIGIN`: `https://www.skloservis-brod.cz`, retained for future authorized production use.
- `SERVICE_ROUTES`: the eight stable Czech service slugs mapped to their English slugs, without slashes.
- `ROUTES`: a readonly list of 14 `{ id, cs, en }` page pairs without any deployment base.
  Future `getStaticPaths`, navigation and production sitemap code should consume this same list.
- `pageUrl(page: PageId, language: Language = 'cs', base = '/'): string`:
  returns a local path with the deployment base and trailing slash. An unknown runtime page ID throws
  `RangeError`; TypeScript callers must use `PageId`.
- `equivalentLanguageUrl(pathname: string, language: Language, base = '/'): string | undefined`:
  matches the current page in either language and returns that page's requested language URL.
  The same language returns its own normalized link. Unknown paths or paths outside the base return
  `undefined`, so callers can omit an unavailable switch instead of silently linking to the homepage.
- Types: `Language` (`'cs' | 'en'`), `ServiceSlug` (keys of `SERVICE_ROUTES`), `PageId` and `PageRoute`.

Main page IDs are `home`, `products`, `services`, `gallery`, `contact`, and `privacy`.
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

## Scope and verification

This foundation does not create frontend routes, metadata, redirects, sitemap output or a deployment
mode. `PRODUCTION_ORIGIN` is a constant, not authorization or a switch to production. Preview HTML must
retain `noindex` through the renderer. Future production canonical/hreflang and sitemap output must
use the retained production origin without a preview base and include only ready, checked pages.
No WordPress, production host or DNS changes are part of this work.

Run `node --test tests/urls.test.ts` for focused tests. The repository's inspected test script is
`node --test tests/*.test.ts`; `npm run check` runs `astro check`. Node tests verify exact historical pairs,
uniqueness, service identities, normalized bases, trailing slashes, reciprocal deep links and unknown
paths. They do not establish HTTP status, translation completeness, rendered metadata or deployment
readiness. The lead owns integrated Astro/build/browser verification.
