import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const [beforeDirectory, afterDirectory] = process.argv.slice(2);
assert(
  beforeDirectory && afterDirectory,
  'Usage: node scripts/compare-performance.mjs BEFORE_REPORT AFTER_REPORT',
);
const [before, after] = await Promise.all(
  [beforeDirectory, afterDirectory].map(async (directory) =>
    JSON.parse(await readFile(join(directory, 'measurements.json'), 'utf8')),
  ),
);
assert.equal(before.conditions, after.conditions, 'Measurement conditions changed');
assert.equal(before.pages.length, after.pages.length, 'Measured page coverage changed');
for (const report of [before, after]) {
  assert.equal(report.lighthouse.length, 3, 'Lighthouse measurement is incomplete');
  assert(
    report.lighthouse.every(
      (row) =>
        row.version === before.lighthouse[0].version &&
        row.throttlingMethod === before.lighthouse[0].throttlingMethod,
    ),
    'Lighthouse versions or throttling profiles differ',
  );
}
const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];
const results = [];
for (const previous of before.pages) {
  const current = after.pages.find(
    (page) => page.file === previous.file && page.width === previous.width,
  );
  assert(current, `Missing result: ${previous.file} at ${previous.width}`);
  assert.equal(previous.sections.length, current.sections.length, previous.file);
  const entrance = (row) =>
    row.animations
      .filter((event) => event.type === 'animationend' && event.name.includes('home-hero'))
      .map(({ name, elapsed }) => [name, elapsed])
      .sort();
  assert.deepEqual(entrance(current), entrance(previous), `${previous.file}: entrance changed`);
  const sections = current.sections.map((section, index) => {
    const old = previous.sections[index];
    assert.equal(section.label, old.label, `${previous.file}: section label`);
    for (const property of ['x', 'y', 'width', 'height'])
      assert(
        Math.abs(section.layout[property] - old.layout[property]) < 0.1,
        `${previous.file}: ${section.label} ${property} changed`,
      );
    return {
      label: section.label,
      beforeScrollMs: old.scrollTwoFramesMs,
      afterScrollMs: section.scrollTwoFramesMs,
      images: section.images.length,
      nodes: section.nodes,
    };
  });
  const images = await Promise.all(
    [join(beforeDirectory, previous.screenshot), join(afterDirectory, current.screenshot)].map(
      (file) => sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  assert.deepEqual(images[0].info, images[1].info, previous.file);
  let changedPixels = 0;
  for (let pixel = 0; pixel < images[0].data.length; pixel += 4) {
    if (
      [0, 1, 2, 3].some(
        (channel) =>
          Math.abs(images[0].data[pixel + channel] - images[1].data[pixel + channel]) > 2,
      )
    )
      changedPixels++;
  }
  results.push({
    file: current.file,
    width: current.width,
    beforeCSSBytes: previous.inlineCSSBytes,
    afterCSSBytes: current.inlineCSSBytes,
    beforeTransferBytes: previous.bytes,
    afterTransferBytes: current.bytes,
    changedResources: current.resources
      .filter(
        (resource) =>
          previous.resources.find((old) => old.path === resource.path)?.bytes !== resource.bytes,
      )
      .map((resource) => ({
        ...resource,
        beforeBytes: previous.resources.find((old) => old.path === resource.path)?.bytes ?? null,
      })),
    beforeLCP: previous.lcp,
    afterLCP: current.lcp,
    beforeEntranceStart: previous.animations.find(
      (event) => event.type === 'animationstart' && event.name.includes('home-hero'),
    )?.at,
    afterEntranceStart: current.animations.find(
      (event) => event.type === 'animationstart' && event.name.includes('home-hero'),
    )?.at,
    changedPixels,
    pixelCount: images[0].info.width * images[0].info.height,
    sections,
  });
}

const require = createRequire(import.meta.resolve('@lhci/cli/package.json'));
const { default: puppeteer } = await import(pathToFileURL(require.resolve('puppeteer-core')).href);
const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const file of new Set(before.pages.map((row) => row.file))) {
    const documents = await Promise.all(
      [beforeDirectory, afterDirectory].map((directory) =>
        readFile(join(directory, 'html', file), 'utf8'),
      ),
    );
    const shapes = await page.evaluate(
      (sources) =>
        sources.map((source) => {
          const document = new DOMParser().parseFromString(source, 'text/html');
          const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
            (script) => JSON.parse(script.textContent),
          );
          document
            .querySelectorAll('script,style,link[rel="stylesheet"]')
            .forEach((element) => element.remove());
          const shape = (node) => {
            if (node.nodeType === Node.TEXT_NODE)
              return node.textContent.trim() ? node.textContent.replace(/\s+/g, ' ').trim() : null;
            if (!(node instanceof Element)) return null;
            return [
              node.tagName,
              [...node.attributes]
                .filter((attribute) => !attribute.name.startsWith('data-astro-'))
                .map(({ name, value }) => [name, value])
                .sort(),
              [...node.childNodes].map(shape).filter((value) => value !== null),
            ];
          };
          return { schemas, shape: shape(document.documentElement) };
        }),
      documents,
    );
    assert.deepEqual(shapes[1], shapes[0], `Content, metadata or DOM changed: ${file}`);
  }
} finally {
  await browser.close();
}
const lighthouse = Object.fromEntries(
  ['score', 'lcp', 'speedIndex', 'cls', 'tbt'].map((metric) => [
    metric,
    {
      before: median(before.lighthouse.map((row) => row[metric])),
      after: median(after.lighthouse.map((row) => row[metric])),
    },
  ]),
);
const report = {
  checkedAt: new Date().toISOString(),
  pages: results,
  lighthouse,
  changedScreenshots: results
    .filter((row) => row.changedPixels > 0)
    .map(({ file, width, changedPixels, pixelCount }) => ({
      file,
      width,
      changedPixels,
      pixelCount,
    })),
};
await writeFile(join(afterDirectory, 'comparison.json'), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      pages: results.length,
      sections: results.reduce((sum, row) => sum + row.sections.length, 0),
      lighthouse,
      changedScreenshots: report.changedScreenshots,
    },
    null,
    2,
  ),
);
