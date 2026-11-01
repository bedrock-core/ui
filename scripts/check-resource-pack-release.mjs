import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseFile, resourcePackHash, selectResourcePack, texturePackVersion } from './resource-pack-policy.mjs';

/** Validate the exact tagged candidate and decide whether it owns a new artifact. */
export function checkResourcePackRelease(requested, ui, pack, selected, sourceHash) {
  assert.equal(ui, requested, 'The source UI version must match the requested release');
  const expected = selectResourcePack(requested, selected, sourceHash);

  assert.deepEqual(selected, expected, 'Resource pack release metadata is stale; run version-packages before tagging');
  assert.equal(pack, texturePackVersion(selected.uiVersion), 'The tagged resource-pack manifest must match its selected asset release');

  return { release: selected.uiVersion === requested, assetVersion: selected.uiVersion, packVersion: pack };
}

/** A retained selection must already be downloadable before publishing its consumer. */
export function verifyRetainedResourcePack(selection, repository, run = execFileSync) {
  if (selection.release) { return; }

  assert.ok(repository, 'GITHUB_REPOSITORY is required to verify a retained asset');
  const tag = '@bedrock-core/ui@' + selection.assetVersion;
  const filename = 'core-ui-' + selection.assetVersion + '.mcpack';
  const release = JSON.parse(run('gh', ['release', 'view', tag, '--repo', repository, '--json', 'assets'], { encoding: 'utf8' }));

  assert.ok(release.assets?.some(asset => asset.name === filename && asset.size > 0),
    `Retained asset ${filename} is unavailable; prepare a new artifact before publishing`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const positional = args.filter(arg => arg !== '--verify-asset');
  const root = positional[1] ? resolve(positional[1]) : fileURLToPath(new URL('../', import.meta.url));
  const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  const version = read('package.json').version;
  const result = checkResourcePackRelease(positional[0] ?? version, version,
    read('packages/resource-pack/packs/RP/manifest.json').header.version, read(releaseFile), resourcePackHash(root));

  if (args.includes('--verify-asset')) { verifyRetainedResourcePack(result, process.env.GITHUB_REPOSITORY); }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, 'release=' + result.release + '\nasset_version=' + result.assetVersion + '\npack_version=' + result.packVersion + '\n');
  }

  console.info(JSON.stringify(result));
}
