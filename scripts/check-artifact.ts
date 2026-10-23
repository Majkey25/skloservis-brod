// Refuses to hand an artifact to Pages unless its indexing state matches the selected target.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { artifactProblems, deployment } from '../src/lib/seo.ts';
import { decodeContact } from '../src/lib/contact.ts';

const { target, outDir } = deployment(process.env.SITE_BUILD_TARGET);
const files = (await readdir(outDir, { recursive: true })).filter((file) => file.endsWith('.html'));
const pages = await Promise.all(
  files.map(async (file) => ({
    path: file.replaceAll('\\', '/'),
    html: await readFile(join(outDir, file), 'utf8'),
  })),
);
const robots = await readFile(join(outDir, 'robots.txt'), 'utf8');
const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf8').catch(() => '');
const problems = artifactProblems(target, pages, robots, sitemap);
const contacts = new Set(
  pages.flatMap(({ html }) =>
    [...html.matchAll(/<[^>]*data-contact-value="([^"]+)"[^>]*>/g)].map(([tag, encoded]) => {
      const kind = /data-contact-kind="(phone|email)"/.exec(tag)?.[1];
      if (kind !== 'phone' && kind !== 'email') throw new TypeError('Missing contact kind');
      return decodeContact(encoded, kind);
    }),
  ),
);
if (!contacts.size) problems.push('Missing protected contacts');
for (const { path, html } of pages) {
  if (/href=["'](?:mailto|tel):/i.test(html)) problems.push(`${path}: initial contact URI exposed`);
  for (const value of contacts) {
    if (html.includes(value) || html.includes(encodeURIComponent(value)))
      problems.push(`${path}: raw contact exposed`);
  }
}
for (const file of (await readdir(outDir, { recursive: true })).filter((file) =>
  /\.(js|json|xml)$/.test(file),
)) {
  const text = await readFile(join(outDir, file), 'utf8');
  for (const value of contacts) {
    if (text.includes(value) || text.includes(encodeURIComponent(value)))
      problems.push(`${file}: raw contact exposed`);
  }
}
for (const problem of problems) console.error(`::error::${problem}`);
if (problems.length) process.exit(1);
console.log(`${target} artifact checked: ${pages.length} HTML pages in ${outDir}`);
