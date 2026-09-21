#!/usr/bin/env node
/**
 * Keep the CLI starter template's `@bedrock-core/ui` dependency in sync with the
 * meta package's current version.
 *
 * Runs after `bump-meta.mjs` (inside `yarn version-packages`) so a freshly
 * scaffolded project always pins the version that was just released. The
 * template file is not a workspace — it ships verbatim inside `@bedrock-core/cli`
 * — so it must be edited directly. Its indentation is **tabs**; preserve it.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TEMPLATE = 'packages/cli/templates/bedrock-core/package.json';
const TEMPLATE_MANIFESTS = [
	'packages/cli/templates/bedrock-core/packs/BP/manifest.json',
	'packages/cli/templates/bedrock-core/packs/BP/manifest.test.json',
];
const RENDER_MANIFEST = 'packages/resource-pack/packs/RP/manifest.json';

const rootVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const renderManifest = JSON.parse(readFileSync(RENDER_MANIFEST, 'utf8'));
const renderUuid = renderManifest.header?.uuid;
const renderVersion = renderManifest.header?.version;

if (typeof renderUuid !== 'string' || typeof renderVersion !== 'string') {
	throw new Error(`sync-cli-template: invalid render-pack manifest ${RENDER_MANIFEST}`);
}

const template = JSON.parse(readFileSync(TEMPLATE, 'utf8'));
template.dependencies ??= {};

let changed = false;

if (template.dependencies['@bedrock-core/ui'] !== rootVersion) {
	template.dependencies['@bedrock-core/ui'] = rootVersion;
	writeFileSync(TEMPLATE, JSON.stringify(template, null, '\t') + '\n');
	console.log(`sync-cli-template: @bedrock-core/ui → ${rootVersion}`);
	changed = true;
}

for (const file of TEMPLATE_MANIFESTS) {
	const manifest = JSON.parse(readFileSync(file, 'utf8'));
	const dependency = manifest.dependencies?.find((entry) => entry.uuid === renderUuid);

	if (!dependency) {
		throw new Error(`sync-cli-template: ${file} has no dependency on render pack ${renderUuid}`);
	}

	if (String(dependency.version) !== String(renderVersion)) {
		dependency.version = renderVersion;
		writeFileSync(file, JSON.stringify(manifest, null, '\t') + '\n');
		console.log(`sync-cli-template: ${file} render-pack dependency → ${renderVersion}`);
		changed = true;
	}
}

if (!changed) {
	console.log(`sync-cli-template: UI ${rootVersion} and render pack ${renderVersion} already synchronized.`);
}
