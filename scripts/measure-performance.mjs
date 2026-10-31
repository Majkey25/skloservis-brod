import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

// Reuse the browser tools pinned by the existing Lighthouse CI dependency.
const require = createRequire(import.meta.resolve('@lhci/cli/package.json'));
const { default: puppeteer } = await import(pathToFileURL(require.resolve('puppeteer-core')).href);
const { default: lighthouse } = await import(pathToFileURL(require.resolve('lighthouse')).href);
const [input, destination, mode = 'all'] = process.argv.slice(2);
assert(
  input && destination && ['all', 'lighthouse'].includes(mode),
  'Usage: node scripts/measure-performance.mjs ARTIFACT REPORT_DIRECTORY [all|lighthouse]',
);
const artifact = resolve(input);
const output = resolve(destination);
assert(
  mode !== 'all' || !existsSync(join(output, 'measurements.json')),
  'Use a new report directory to preserve the baseline',
);
assert(
  output !== artifact && !output.startsWith(artifact + sep),
  'Reports must stay outside the artifact',
);
const home = await readFile(join(artifact, 'index.html'), 'utf8');
const englishHome = home.match(/data-home-en="([^"]+)"/)?.[1];
assert(englishHome?.startsWith('/') && englishHome.endsWith('/en/'));
const base = englishHome.slice(0, -3);
const pages = (await readdir(artifact, { recursive: true }))
  .filter((file) => file.endsWith('.html'))
  .sort();
assert(pages.includes('index.html') && pages.includes(join('en', 'index.html')));
await promisify(execFile)(process.execPath, [
  fileURLToPath(new URL('./check-output.mjs', import.meta.url)),
  artifact,
]);
await mkdir(output, { recursive: true });
for (const file of pages) {
  const snapshot = join(output, 'html', file);
  const html = await readFile(join(artifact, file));
  if (mode === 'all') {
    await mkdir(dirname(snapshot), { recursive: true });
    await writeFile(snapshot, html);
  } else {
    assert(html.equals(await readFile(snapshot)), `Artifact changed since measurement: ${file}`);
  }
}
const zip = promisify(gzip);
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.json': 'application/json',
};
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const relative = pathname.slice(base.length) + (pathname.endsWith('/') ? 'index.html' : '');
    const file = resolve(artifact, relative);
    if (!file.startsWith(artifact + sep)) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    const type = mime[extname(file)] ?? 'application/octet-stream';
    const compressed = /html|javascript|css|svg|json/.test(type);
    const payload = compressed ? await zip(body) : body;
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'max-age=600',
      ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
    });
    response.end(request.method === 'HEAD' ? undefined : payload);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
});
const report =
  mode === 'lighthouse'
    ? JSON.parse(await readFile(join(output, 'measurements.json'), 'utf8'))
    : {
        artifact,
        measuredAt: new Date().toISOString(),
        conditions:
          'Cold contexts, local compressed HTTP, 150ms latency, 1.6Mbps, mobile CPU4x/DPR1.75 and desktop CPU1x/DPR1. All sections counted; viewport images measured, offscreen images stay lazy. Scroll timings are two-frame costs, not field INP.',
        pages: [],
        lighthouse: [],
      };
assert.equal(report.artifact, artifact, 'The existing report belongs to another artifact');
const hash = (value) => createHash('sha256').update(value).digest('hex');
let browser;

try {
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({
    channel: 'chrome',
    headless: true,
    ignoreDefaultArgs: ['--hide-scrollbars'],
  });
  const port = Number(new URL(browser.wsEndpoint()).port);
  for (const width of mode === 'all' ? [390, 1440] : []) {
    for (const file of pages) {
      const context = await browser.createBrowserContext();
      try {
        const page = await context.newPage();
        await page.setViewport({
          width,
          height: width === 390 ? 844 : 900,
          deviceScaleFactor: width === 390 ? 1.75 : 1,
          isMobile: width === 390,
          hasTouch: width === 390,
        });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
        const session = await page.createCDPSession();
        await page.emulateNetworkConditions({
          latency: 150,
          download: 204800,
          upload: 204800,
        });
        await session.send('Emulation.setCPUThrottlingRate', { rate: width === 390 ? 4 : 1 });
        await page.setRequestInterception(true);
        const errors = [];
        page.on('request', (request) => {
          if (request.method() === 'GET' && request.url().startsWith(origin + '/'))
            void request.continue();
          else {
            errors.push(`Blocked request: ${request.method()} ${request.url()}`);
            void request.abort();
          }
        });
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => {
          if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
        });
        await page.evaluateOnNewDocument(() => {
          window.__measurement = { lcp: 0, cls: 0, tasks: [], animations: [] };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__measurement.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput) window.__measurement.cls += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__measurement.tasks.push(entry.duration);
          }).observe({ type: 'longtask', buffered: true });
          for (const type of ['animationstart', 'animationend'])
            document.addEventListener(type, (event) =>
              window.__measurement.animations.push({
                type,
                name: event.animationName,
                at: performance.now(),
                elapsed: event.elapsedTime,
              }),
            );
        });
        const route = file.replaceAll('\\', '/').replace(/index\.html$/, '');
        const url = `${origin}${base}${route}?performance-measurement`;
        const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        assert.equal(response.status(), 200, file);
        await page.waitForFunction(() => !document.documentElement.dataset.entry, {
          timeout: 15000,
        });
        const initial = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          return {
            ...window.__measurement,
            fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0,
            htmlBytes: navigation.encodedBodySize,
            navigation: {
              requestStart: navigation.requestStart,
              responseStart: navigation.responseStart,
              responseEnd: navigation.responseEnd,
              duration: navigation.duration,
            },
            bytes:
              navigation.transferSize +
              resources.reduce((sum, resource) => sum + resource.transferSize, 0),
            resources: resources.map(({ name, initiatorType, encodedBodySize }) => ({
              path: new URL(name).pathname,
              kind: initiatorType,
              bytes: encodedBodySize,
            })),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            domNodes: document.querySelectorAll('*').length,
            inlineCSSBytes: [...document.querySelectorAll('style')].reduce(
              (sum, style) => sum + new TextEncoder().encode(style.textContent).length,
              0,
            ),
          };
        });
        assert.equal(initial.overflow, 0, `${width} ${file}`);
        const shot = await page.screenshot();
        const screenshot = `${width}-${route.replaceAll('/', '_') || 'home'}.png`;
        await writeFile(join(output, screenshot), shot);
        const sections = await page.evaluate(async () => {
          const results = [];
          for (const element of document.querySelectorAll(
            'body > header, main section, main > article, main > .section, main > .page-intro, body > footer',
          )) {
            const rect = element.getBoundingClientRect();
            const images = [...element.querySelectorAll('img')].map((image) => ({
              source: image.currentSrc ? new URL(image.currentSrc).pathname : '',
              width: image.width,
              height: image.height,
              naturalWidth: image.naturalWidth,
              loading: image.loading,
            }));
            const label =
              element.getAttribute('aria-label') ||
              element.querySelector('h1,h2,h3')?.textContent.trim() ||
              element.id ||
              element.className;
            const layout = {
              x: rect.x,
              y: rect.y + scrollY,
              width: rect.width,
              height: rect.height,
            };
            const started = performance.now();
            element.scrollIntoView({ block: 'start', behavior: 'instant' });
            await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            results.push({
              label,
              tag: element.tagName,
              classes: element.className,
              nodes: element.querySelectorAll('*').length,
              htmlBytes: new TextEncoder().encode(element.outerHTML).length,
              text: element.textContent.replace(/\s+/g, ' ').trim(),
              layout,
              images,
              scrollTwoFramesMs: performance.now() - started,
            });
          }
          return results;
        });
        assert(sections.length > 1, `No measurable content: ${file}`);
        assert.deepEqual(errors, [], file);
        const row = {
          file: file.replaceAll('\\', '/'),
          width,
          ...initial,
          screenshot,
          screenshotSHA256: hash(shot),
          sections: sections.map(({ text, ...section }) => ({
            ...section,
            textSHA256: hash(text),
          })),
          errors,
        };
        report.pages.push(row);
        await writeFile(join(output, 'measurements.json'), JSON.stringify(report, null, 2));
        console.log(
          `${width} ${row.file}: LCP ${Math.round(row.lcp)}ms, CSS ${row.inlineCSSBytes} bytes, ${sections.length} sections`,
        );
      } finally {
        await context.close();
      }
    }
  }
  assert.equal(report.pages.length, pages.length * 2);
  report.lighthouse = [];
  await writeFile(join(output, 'measurements.json'), JSON.stringify(report, null, 2));
  for (let sample = 1; sample <= 3; sample++) {
    const { lhr, report: json } = await lighthouse(`${origin}${base}?performance-measurement`, {
      port,
      output: 'json',
      logLevel: 'error',
      throttlingMethod: 'devtools',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    assert(!lhr.runtimeError, JSON.stringify(lhr.runtimeError));
    await writeFile(join(output, `lighthouse-${sample}.json`), json);
    report.lighthouse.push({
      sample,
      version: lhr.lighthouseVersion,
      throttlingMethod: lhr.configSettings.throttlingMethod,
      score: lhr.categories.performance.score * 100,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      speedIndex: lhr.audits['speed-index'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
    });
    console.log(JSON.stringify(report.lighthouse.at(-1)));
  }
  await writeFile(join(output, 'measurements.json'), JSON.stringify(report, null, 2));
} finally {
  if (server.listening) server.close();
  await browser?.close();
}
