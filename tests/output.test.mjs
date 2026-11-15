import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { ROUTES } from '../src/lib/urls.ts';
import { encodeContact } from '../src/lib/contact.ts';

const checker = fileURLToPath(new URL('../scripts/check-output.mjs', import.meta.url));
const artifactChecker = fileURLToPath(new URL('../scripts/check-artifact.ts', import.meta.url));
const targetSelector = fileURLToPath(new URL('../scripts/pages-target.ts', import.meta.url));
const scratch = resolve('.reference/tmp');

test('Pages target selection runs before dependency installation', async (t) => {
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, 'output-bootstrap-'));
  t.after(async () => {
    assert.equal(dirname(root), scratch);
    await rm(root, { recursive: true, force: true });
  });
  const preload = join(root, 'no-packages.mjs');
  await writeFile(
    preload,
    `import { isBuiltin, registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!isBuiltin(specifier) && !specifier.startsWith('.') && !specifier.startsWith('file:'))
      throw new Error('Package unavailable before installation: ' + specifier);
    return nextResolve(specifier, context);
  }
});`,
  );
  for (const [event, ref, expected] of [
    ['pull_request', 'refs/pull/31/merge', 'target=preview\nout=dist\n'],
    ['push', 'refs/heads/main', 'target=production\nout=.reference/build-production\n'],
  ]) {
    const output = join(root, `${event}.txt`);
    const result = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(preload).href, targetSelector],
      {
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: event,
          GITHUB_REF: ref,
          SITE_DEPLOY_TARGET: 'production',
          GITHUB_OUTPUT: output,
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(output, 'utf8'), expected);
  }
});

test('artifact safety checks inspect real output files', async (t) => {
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, 'output-'));
  t.after(async () => {
    assert.equal(dirname(root), scratch);
    await rm(root, { recursive: true, force: true });
  });
  const output = join(root, 'dist');
  await mkdir(join(output, '.well-known'), { recursive: true });
  await writeFile(join(output, 'index.html'), '<!doctype html><title>Public site</title>');
  await writeFile(join(output, '.well-known/security.txt'), 'Contact: https://example.com/contact');
  const run = (path = output) => spawnSync(process.execPath, [checker, path], { encoding: 'utf8' });
  assert.equal(run().status, 0, 'A normal site with public .well-known files must pass');

  for (const name of [
    '.env.production',
    '.envrc',
    '.npmrc',
    'private.pem',
    'client-secret.json',
    'credentials',
  ]) {
    const path = join(output, '.well-known', name);
    await writeFile(path, 'fixture');
    const result = run();
    assert.notEqual(result.status, 0, name);
    assert.match(result.stderr, /Private file or directory in output/);
    await rm(path);
  }

  const outside = join(root, 'outside');
  await mkdir(outside);
  for (const path of [join(root, 'linked-root'), join(output, 'linked-assets')]) {
    await symlink(outside, path, process.platform === 'win32' ? 'junction' : 'dir');
    const result = run(path.endsWith('linked-root') ? path : output);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Symbolic link in output/);
    await rm(path);
  }

  await rm(join(output, 'index.html'));
  assert.notEqual(run().status, 0, 'Missing index.html must fail');
  await mkdir(join(output, 'index.html'));
  const directoryIndex = run();
  assert.notEqual(directoryIndex.status, 0);
  assert.match(directoryIndex.stderr, /Output must contain index.html/);
});

test('artifact metadata rejects missing image files and directories', async (t) => {
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, 'output-images-'));
  t.after(async () => {
    assert.equal(dirname(root), scratch);
    await rm(root, { recursive: true, force: true });
  });
  const output = join(root, 'dist');
  const paths = [
    ...ROUTES.flatMap(({ cs, en }) => [cs, en]).map((path) => `${path.slice(1)}index.html`),
    '404.html',
    'home/index.html',
  ];
  for (const path of paths) {
    const file = join(output, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(
      file,
      `<meta name="robots" content="noindex, follow">${
        path === 'home/index.html'
          ? '<meta http-equiv="refresh" content="0;url=/skloservis-brod/">'
          : ''
      }`,
    );
  }
  await writeFile(
    join(output, 'index.html'),
    `<meta name="robots" content="noindex, follow"><meta property="og:image" content="https://majkey25.github.io/skloservis-brod/photo.jpg"><span data-contact-kind="email" data-contact-value="${encodeContact('fixture@example.com')}"></span>`,
  );
  await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  const photo = join(output, 'photo.jpg');
  await writeFile(photo, 'fixture');
  const run = () =>
    spawnSync(process.execPath, [artifactChecker], {
      cwd: root,
      env: { ...process.env, SITE_BUILD_TARGET: 'preview' },
      encoding: 'utf8',
    });
  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);
  await rm(photo);
  const missing = run();
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /og:image: image asset must be a built local file/);
  await mkdir(photo);
  const directory = run();
  assert.notEqual(directory.status, 0);
  assert.match(directory.stderr, /og:image: image asset must be a built local file/);
});
