#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packDirectory, releaseFile, resourcePackHash, selectResourcePack, texturePackVersion } from './resource-pack-policy.mjs';

/** Prepare a new pack for minor releases and changed assets; retain unchanged patch assets. */
export function syncPackVersion(root = process.cwd(), uiVersion, { newArtifact = false } = {}) {
  const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const save = (file, value) => writeFileSync(join(root, file), JSON.stringify(value, null, '\t') + '\n');
  const candidate = uiVersion ?? read('package.json').version;
  const previous = read(releaseFile);
  const selected = selectResourcePack(candidate, previous, resourcePackHash(root), newArtifact);
  const manifestFile = packDirectory + '/packs/RP/manifest.json';
  const manifest = read(manifestFile);
  const version = texturePackVersion(selected.uiVersion);

  if (manifest.header.version !== version) {
    manifest.header.version = version;
    save(manifestFile, manifest);
  }

  if (selected !== previous) { save(releaseFile, selected); }

  return { uiVersion: candidate, assetVersion: selected.uiVersion, packVersion: version, release: selected.uiVersion === candidate };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  console.info(JSON.stringify(syncPackVersion(process.cwd(), args.find(arg => arg !== '--new-artifact'), { newArtifact: args.includes('--new-artifact') })));
}
