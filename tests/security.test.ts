import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const layout = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
const policy = layout.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
assert.ok(policy, 'The shared layout must provide a resource policy');
const entries = policy[1].split(';').map((entry) => entry.trim().split(/\s+/));
const directives = new Map(entries.map(([name, ...sources]) => [name, sources]));

test('resource policy blocks base replacement, plugins, workers and inline event handlers', () => {
  assert.equal(directives.size, entries.length, 'Duplicate directives can hide policy mistakes');
  for (const name of ['base-uri', 'object-src', 'worker-src', 'script-src-attr']) {
    assert.deepEqual(directives.get(name), ["'none'"], name);
  }
});

test('resource policy limits connections, forms, frames and local assets', () => {
  assert.deepEqual(directives.get('connect-src'), ["'self'", 'https://api.web3forms.com']);
  assert.deepEqual(directives.get('form-action'), ['https://api.web3forms.com']);
  assert.deepEqual(directives.get('frame-src'), ['https://www.google.com/maps/embed']);
  for (const name of ['img-src', 'font-src', 'media-src', 'manifest-src']) {
    assert.deepEqual(directives.get(name), ["'self'"], name);
  }
});

test('policy and cross-origin referrer protection precede the first-paint bootstrap', () => {
  const head = layout.slice(layout.indexOf('<head>'), layout.indexOf('</head>'));
  const firstResource = head.search(/<(?:script|link)\b/);
  assert.ok(firstResource >= 0);
  const cspPosition = head.indexOf('http-equiv="Content-Security-Policy"');
  const referrerPosition = head.indexOf(
    '<meta name="referrer" content="strict-origin-when-cross-origin" />',
  );
  assert.ok(cspPosition >= 0 && cspPosition < firstResource);
  assert.ok(referrerPosition >= 0 && referrerPosition < firstResource);
});
