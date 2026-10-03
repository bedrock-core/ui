#!/usr/bin/env node
/**
 * Keep the shared texture pack aligned with each UI release, including releases
 * with unchanged textures. The pack major is the UI major + 1; the rest matches.
 * Runs after bump-meta.mjs during version-packages. An optional UI version
 * argument selects the release when packaging an artifact.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const MANIFEST = 'packages/resource-pack/packs/RP/manifest.json';
const BEHAVIOR_MANIFEST = 'packages/resource-pack/packs/BP/manifest.json';

const uiVersion = process.argv[2] ?? JSON.parse(readFileSync('package.json', 'utf8')).version;
const match = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.exec(uiVersion);

if (!match) {
	console.error(`sync-pack-version: could not parse the UI version "${uiVersion}"`);
	process.exit(1);
}

const next = `${Number(match[1]) + 1}.${match[2]}.${match[3]}${match[4] ?? ''}${match[5] ?? ''}`;
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

if (manifest.header.version !== next) {
	manifest.header.version = next;
	writeFileSync(MANIFEST, JSON.stringify(manifest, null, '\t') + '\n');
}

if (existsSync(BEHAVIOR_MANIFEST)) {
	const behavior = JSON.parse(readFileSync(BEHAVIOR_MANIFEST, 'utf8'));
	const dependency = behavior.dependencies?.find((entry) => entry.uuid === manifest.header.uuid);

	if (dependency && dependency.version !== next) {
		dependency.version = next;
		writeFileSync(BEHAVIOR_MANIFEST, JSON.stringify(behavior, null, '\t') + '\n');
	}
}

console.log(`sync-pack-version: UI ${uiVersion}, texture pack ${next}.`);
