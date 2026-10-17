# Skloservis Brod

[![Site checks](https://github.com/Majkey25/skloservis-brod/actions/workflows/site.yml/badge.svg)](https://github.com/Majkey25/skloservis-brod/actions/workflows/site.yml)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)](.nvmrc)
[![Pages CMS](https://img.shields.io/badge/Pages_CMS-configured-111827)](.pages.yml)
[![Last commit](https://img.shields.io/github/last-commit/Majkey25/skloservis-brod)](https://github.com/Majkey25/skloservis-brod/commits/main)

Website for **SKLOSERVIS-BROD s.r.o.**, a custom glass workshop in Uherský Brod, Czech Republic. Built with static Astro pages, validated bilingual business content and a Pages CMS configuration.

The [GitHub Pages preview](https://majkey25.github.io/skloservis-brod/) is separate from the current public website, [skloservis-brod.cz](https://www.skloservis-brod.cz/). Preview pages use `noindex`; this repository has not replaced the production website.

## Included

- Czech and English home, product, service, gallery, contact and legal pages, preserving existing Czech product addresses.
- Responsive layouts, device-based light/dark theme and manual language and theme controls.
- Editable weekly opening hours, dated exceptions and scheduled information, attention and warning notices.
- A curated set of 18 supplied project photographs and CMS gallery fields.
- Build-time content validation and focused tests for dates, schedules and invalid content.
- A GitHub Actions workflow that checks formatting, TypeScript, tests and the static build before an explicitly requested Pages deployment.

CMS sign-in, a live editing round-trip and direct form delivery have not yet been verified. The enquiry address is `skloservis.brod@gmail.com`; a mail relay is not active.

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

## Privacy and legal information

The repository includes Czech and English [privacy notices](src/pages/ochrana-osobnich-udaju.md), [cookies and storage information](src/pages/cookies.md), and [company and consumer information](src/pages/pravni-informace.md). No analytics, advertising or mail relay is configured. Legal notices describe the current implementation; account-specific provider arrangements and operational retention procedures require separate verification.

Supplied photographs and branding belong to their respective rights holders. No open-source media license or stock-video rights are implied.
