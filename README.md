# Skloservis Brod

[![Site checks](https://github.com/Majkey25/skloservis-brod/actions/workflows/site.yml/badge.svg)](https://github.com/Majkey25/skloservis-brod/actions/workflows/site.yml)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)](.nvmrc)
[![Pages CMS](https://img.shields.io/badge/Pages_CMS-configured-111827)](.pages.yml)
[![Last commit](https://img.shields.io/github/last-commit/Majkey25/skloservis-brod)](https://github.com/Majkey25/skloservis-brod/commits/main)

Website for **SKLOSERVIS-BROD s.r.o.**, a custom glass workshop in Uherský Brod, Czech Republic. Built with static Astro pages, validated bilingual business content and a Pages CMS configuration.

The [source repository](https://github.com/Majkey25/skloservis-brod) publishes a [GitHub Pages preview](https://majkey25.github.io/skloservis-brod/). Preview pages use `noindex`. The current public website, [skloservis-brod.cz](https://www.skloservis-brod.cz/), remains separate.

## Included

- Czech and English home, product, service, gallery, contact and legal pages, preserving existing Czech product addresses.
- Responsive layouts, animated language/theme switches and persistent manual choices, with reduced-motion support.
- Editable weekly opening hours, Czech public-holiday closures, dated exceptions and scheduled information, attention and warning notices, evaluated using Europe/Prague dates.
- Local optimized photographs that expand beyond their frames on hover or focus, a keyboard-accessible gallery viewer and CMS gallery fields.
- Service and product cards that turn over on mouse hover, with a button for keyboard and touch, plus scroll reveals and counting annual figures that stay readable without JavaScript or with reduced motion.
- Google Maps loaded only after visitor consent, with an external map link available without JavaScript.
- Phone/email copying and a direct enquiry form with product-specification guidance.
- Build-time content validation and focused tests for dates, schedules and invalid content.
- GitHub Actions checks for formatting, TypeScript, tests and the static build, followed by Pages publication for successful pushes to `main`.

CMS forms and content validation are configured. CMS sign-in, account permissions and a live save-to-deployment round-trip require an authorized account. Enquiries can be submitted directly through FormSubmit to `skloservis.brod@gmail.com`, with validation, a sending state, timeout handling and preserved input on failure. Without JavaScript the form uses native POST; phone and email links remain available. Relay acceptance alone does not establish inbox delivery, and recipient activation is required.

## Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Site       | Astro, static output                          |
| Types      | Strict TypeScript                             |
| Content    | YAML, validated schemas, Pages CMS            |
| Images     | Local assets, Astro image pipeline and Sharp  |
| Checks     | Astro check, Node.js test runner and Prettier |
| Deployment | GitHub Actions and GitHub Pages               |

## Local development

Use Node.js 24.

```sh
npm ci
npm run dev
npm run format:check
npm run check
npm test
npm run build
```

## Editing content

Business content lives in [`src/data`](src/data). The [Pages CMS configuration](.pages.yml) exposes editing forms. See the [Czech editing guide](docs/editace.md) for opening hours, notices and gallery updates. An authorized GitHub account and Pages CMS access are required.

## Preview publication

The [Site workflow](.github/workflows/site.yml) verifies pull requests and pushes to `main`. Every push to `main`, including a CMS save that creates a commit there, publishes only after all checks pass. An authorized manual run on `main` can also publish by enabling `publish`; its default is checks only.

Both publication paths deploy the `dist` artifact produced by the same run's verification job, without a second build. Failed validation prevents artifact publication and deployment, leaving the previous successful preview online. Pull requests and manual runs on other branches cannot deploy. Future notices and opening-hour exceptions are already included in page data, so their date changes do not require daily scheduled builds. Without JavaScript, dated information remains readable with its validity dates.

The [Czech deployment and domain handover guide](docs/nasazeni.md) lists the remaining access checks, production preparation, DNS and mail safeguards, verification and rollback. A custom-domain cutover is separate from this preview.

## Privacy and legal information

The repository includes Czech and English [privacy notices](src/pages/ochrana-osobnich-udaju.md), [cookies and storage information](src/pages/cookies.md), and [company and consumer information](src/pages/pravni-informace.md). No analytics or advertising is configured. FormSubmit receives enquiry data only on submission. Legal notices describe the current implementation; account-specific provider arrangements and operational retention procedures require separate verification.

Supplied photographs and branding belong to their respective rights holders. No open-source media license or stock-video rights are implied.
