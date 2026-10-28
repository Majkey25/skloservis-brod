import assert from 'node:assert/strict';
import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const output = process.argv[2] ?? 'dist';
const privateName =
  /^(?:\.env|\.git$|\.npmrc$|\.netrc$|\.aws$|\.ssh$|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$))|(?:^|[._-])(?:secrets?|credentials?)(?:[._-]|$)|\.(?:pem|key|p12|pfx|keystore|jks)$/i;

async function check(path) {
  const entry = await lstat(path);
  assert(!entry.isSymbolicLink(), `Symbolic link in output: ${path}`);
  if (entry.isDirectory()) {
    for (const name of await readdir(path)) {
      assert(!privateName.test(name), `Private file or directory in output: ${join(path, name)}`);
      await check(join(path, name));
    }
  } else {
    assert(entry.isFile(), `Non-regular file in output: ${path}`);
  }
}

await check(output);
assert((await lstat(join(output, 'index.html'))).isFile(), 'Output must contain index.html');
console.log(`Output checked: ${output}`);
