import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(new URL('../scripts/check-output.mjs', import.meta.url));
const scratch = resolve('.reference/tmp');

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
