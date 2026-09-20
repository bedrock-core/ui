#!/usr/bin/env node
/**
 * Tag the public packages selected by the matching publish command.
 *
 * Changesets Action v3 reads JSONL events from CHANGESETS_OUTPUT when a custom
 * publish script is used. Reporting each new tag here lets the action push the
 * tags and create the corresponding GitHub releases. The CLI is deliberately
 * excluded from the library lane and tagged by its own final release workflow.
 *
 * Usage: node scripts/tag-packages.mjs [excluded-package-name ...]
 *        node scripts/tag-packages.mjs --only <package-name>
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const only = args[0] === '--only' ? args[1] : undefined;
const exclude = new Set(only === undefined ? args : []);
const shell = process.platform === 'win32';

function run(command, commandArgs, options = {}) {
	return execFileSync(command, commandArgs, { encoding: 'utf8', shell, ...options });
}

const workspaces = run('yarn', ['workspaces', 'list', '--json'])
	.trim()
	.split('\n')
	.filter(Boolean)
	.map(line => JSON.parse(line));

for (const workspace of workspaces) {
	const manifest = JSON.parse(readFileSync(join(workspace.location, 'package.json'), 'utf8'));

	if (manifest.private === true || manifest.version === '0.0.0') continue;
	if (only !== undefined ? manifest.name !== only : exclude.has(manifest.name)) continue;

	const tag = `${manifest.name}@${manifest.version}`;
	let exists = true;

	try {
		run('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { stdio: 'ignore' });
	} catch {
		exists = false;
	}

	if (exists) {
		console.log(`tag     ${tag} - already exists`);
		continue;
	}

	run('git', ['tag', tag], { stdio: 'inherit' });
	console.log(`tag     ${tag}`);

	if (process.env.CHANGESETS_OUTPUT) {
		appendFileSync(
			process.env.CHANGESETS_OUTPUT,
			`${JSON.stringify({ type: 'git-tag', tag, packageName: manifest.name })}\n`,
		);
	}
}
