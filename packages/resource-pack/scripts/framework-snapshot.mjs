#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATED = resolve('.regolith/cache/references/framework.generated.ts');
const mode = process.argv[2];

if (!existsSync(GENERATED)) {
	console.error(`framework-snapshot: ${GENERATED} is missing; build the resource pack first`);
	process.exit(1);
}

let target;

if (mode === 'sync') {
	target = resolve('../../../apps/packages/catalog/src/generated/framework.generated.ts');
} else if (mode === 'verify') {
	const catalog = fileURLToPath(import.meta.resolve('@bedrock-core/catalog'));

	target = resolve(dirname(catalog), 'generated/framework.generated.ts');
} else {
	console.error('usage: framework-snapshot.mjs <sync|verify>');
	process.exit(1);
}

if (mode === 'verify') {
	if (!existsSync(target) || readFileSync(GENERATED, 'utf8') !== readFileSync(target, 'utf8')) {
		console.error('framework-snapshot: generated reference differs from the installed @bedrock-core/catalog snapshot');
		console.error('Run `yarn sync-framework` before releasing Apps, then publish the matching Catalog version.');
		process.exit(1);
	}

	console.log('framework-snapshot: installed Catalog snapshot matches the resource pack');
} else {
	mkdirSync(dirname(target), { recursive: true });
	copyFileSync(GENERATED, target);
	console.log(`framework-snapshot: updated ${target}`);
}
