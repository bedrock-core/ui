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

const TEMPLATE = 'packages/cli/templates/ore-styled/package.json';

const rootVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const range = `^${rootVersion}`;

const template = JSON.parse(readFileSync(TEMPLATE, 'utf8'));
template.dependencies ??= {};

if (template.dependencies['@bedrock-core/ui'] === range) {
	console.log(`sync-cli-template: already at @bedrock-core/ui ${range}.`);
	process.exit(0);
}

template.dependencies['@bedrock-core/ui'] = range;
writeFileSync(TEMPLATE, JSON.stringify(template, null, '\t') + '\n');
console.log(`sync-cli-template: @bedrock-core/ui → ${range}`);
