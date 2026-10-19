// Refuses to hand an artifact to Pages unless its indexing state matches the selected target.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { artifactProblems, deployment } from '../src/lib/seo.ts';

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
for (const problem of problems) console.error(`::error::${problem}`);
if (problems.length) process.exit(1);
console.log(`${target} artifact checked: ${pages.length} HTML pages in ${outDir}`);
