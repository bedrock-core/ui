import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const packDirectory = 'packages/resource-pack';
export const releaseFile = packDirectory + '/release.json';

export function releaseVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.exec(version);

  assert.ok(match, 'Expected an exact release version: ' + version);

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? '', build: match[5] ?? '' };
}

export function texturePackVersion(uiVersion) {
  const version = releaseVersion(uiVersion);

  return `${version.major + 1}.${version.minor}.${version.patch}${version.prerelease}${version.build}`;
}

function compareVersions(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) { return left[key] > right[key] ? 1 : -1; }
  }

  if (left.prerelease === right.prerelease) { return 0; }

  if (!left.prerelease || !right.prerelease) { return left.prerelease ? -1 : 1; }

  const a = left.prerelease.slice(1).split('.');
  const b = right.prerelease.slice(1).split('.');

  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    if (a[index] === undefined || b[index] === undefined) { return a[index] === undefined ? -1 : 1; }

    if (a[index] === b[index]) { continue; }

    const aNumber = /^\d+$/.test(a[index]);
    const bNumber = /^\d+$/.test(b[index]);

    return aNumber && bNumber ? Math.sign(Number(a[index]) - Number(b[index]))
      : aNumber !== bNumber ? aNumber ? -1 : 1 : a[index] > b[index] ? 1 : -1;
  }

  return 0;
}

function canonical(value) {
  if (Array.isArray(value)) { return value.map(canonical); }

  return value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
}

/** Hash artifact inputs; version labels and deployment destinations do not change assets. */
export function resourcePackHash(root) {
  const hash = createHash('sha256');
  const pack = join(root, packDirectory);
  const add = (name, bytes) => hash.update(name).update('\0').update(bytes).update('\0');
  const json = file => JSON.parse(readFileSync(join(pack, file), 'utf8'));

  function visit(relative) {
    for (const entry of readdirSync(join(pack, 'packs/RP', relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const name = relative ? relative + '/' + entry.name : entry.name;

      if (entry.isDirectory()) { visit(name); } else {
        assert.ok(entry.isFile(), 'Resource pack inputs must be regular files: ' + name);

        if (name === 'manifest.json') {
          const manifest = json('packs/RP/' + name);

          delete manifest.header.version;
          add(name, JSON.stringify(canonical(manifest)));
        } else {
          const bytes = readFileSync(join(pack, 'packs/RP', name));

          // Git can check text resources out as CRLF on Windows and LF in CI.
          // Line endings do not select a different shared asset release.
          add(name, /\.(?:jsonc?|lang|txt|material|vsh|fsh)$/i.test(name)
            ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes);
        }
      }
    }
  }

  visit('');

  const config = json('config.json');

  // Only the build profile produces the distributed archive. Output locations
  // select a destination rather than changing its contents.
  config.bedrockCore.profiles = { build: { ...config.bedrockCore.profiles.build } };
  delete config.bedrockCore.profiles.build.export;
  add('config.json', JSON.stringify(canonical(config)));
  add('builder', json('package.json').devDependencies['@bedrock-core/builder']);

  return hash.digest('hex');
}

/** Select the asset release retained by a UI release candidate. */
export function selectResourcePack(uiVersion, previous, sourceHash, newArtifact = false) {
  const current = releaseVersion(uiVersion);
  const selected = releaseVersion(previous.uiVersion);

  assert.match(previous.sourceHash, /^[a-f0-9]{64}$/, 'Resource pack release metadata needs its source hash');
  assert.match(sourceHash, /^[a-f0-9]{64}$/);
  assert.ok(compareVersions(current, selected) >= 0, 'The UI candidate cannot precede its resource pack release');

  const changed = previous.sourceHash !== sourceHash;
  const boundary = current.major !== selected.major || current.minor !== selected.minor
    || current.prerelease !== selected.prerelease || current.build !== selected.build;

  if (changed || boundary || newArtifact && uiVersion !== previous.uiVersion) {
    assert.notEqual(uiVersion, previous.uiVersion, 'Bump the UI release before selecting changed resource pack inputs');

    return { uiVersion, sourceHash };
  }

  return previous;
}
