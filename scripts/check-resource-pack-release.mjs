import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Validate the package and pack identities selected for a release asset. */
export function checkResourcePackRelease(requested, ui, pack) {
  assert.equal(ui, requested, 'The source UI version must match the requested release');
  const match = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.exec(requested);

  assert.ok(match, 'Expected an exact UI release version');
  const expected = String(Number(match[1]) + 1) + '.' + match[2] + '.' + match[3] + (match[4] ?? '') + (match[5] ?? '');

  assert.equal(pack, expected, 'The tagged resource-pack manifest must match the UI release');

  return expected;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const version = checkResourcePackRelease(
    process.argv[2],
    read('../package.json').version,
    read('../packages/resource-pack/packs/RP/manifest.json').header.version,
  );

  console.info('Verified resource pack ' + version + ' for UI ' + process.argv[2]);
}
