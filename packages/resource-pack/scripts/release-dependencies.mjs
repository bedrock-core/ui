#!/usr/bin/env node
/** Validate that an artifact build uses exact published package versions. */
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../package.json', import.meta.url);
const manifest = JSON.parse(readFileSync(file, 'utf8'));

delete manifest.resolutions;

for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
	if (typeof range !== 'string' || /^(?:link|portal|workspace):/.test(range)) {
		throw new Error(`${name} must have an exact published version, got ${JSON.stringify(range)}`);
	}
}

writeFileSync(file, `${JSON.stringify(manifest, null, '\t')}\n`);
console.log('release-dependencies: artifact install will use exact published packages');
