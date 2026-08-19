#!/usr/bin/env node
// Publish every public workspace as a yarn-packed tarball through the npm CLI.
//
// Two tools on purpose, each doing the half the other cannot:
//   - `yarn pack` rewrites the workspace: protocols into concrete versions —
//     `npm publish` from a workspace directory would ship `workspace:*` verbatim
//     and every consumer install would fail.
//   - `npm publish` (>= 11.5.1) performs the OIDC trusted-publishing exchange in
//     CI, which yarn's publisher cannot — so releases need no npm token at all.
//     Locally it falls back to your npm login and prompts for the 2FA code.
//
// A version that is already on the registry is skipped, so re-running after a
// partial release (or after a manual bootstrap publish) is safe — the same job
// `--tolerate-republish` did in the all-yarn flow.
//
// Usage: node scripts/publish-tarballs.mjs [excluded-package-name ...]
//        node scripts/publish-tarballs.mjs --only <package-name>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const only = args[0] === '--only' ? args[1] : undefined;
const exclude = new Set(only === undefined ? args : []);
const shell = process.platform === 'win32';

function run(cmd, args, opts = {}) {
	return execFileSync(cmd, args, { encoding: 'utf-8', shell, ...opts });
}

// ── Workspaces, dependency-ordered ────────────────────────────────────────────
// `-v` includes each workspace's workspaceDependencies, which is all a
// topological sort needs: publish dependencies before dependents so a resolver
// that sees the dependent can already see what it requires.
const rows = run('yarn', ['workspaces', 'list', '--json', '-v'])
	.trim().split('\n').map(line => JSON.parse(line));

const byLocation = new Map(rows.map(row => [row.location, row]));
const pending = rows.filter((row) => {
	// `--only` may name the root workspace — in the ui repo the ROOT is the meta
	// package. The default sweep still skips it: the meta is released separately,
	// after its sub-packages, by the workflow step that owns the .mcpack.
	if (only !== undefined) return row.name === only;
	if (row.location === '.') return false;
	const manifest = JSON.parse(readFileSync(join(row.location, 'package.json'), 'utf-8'));
	return manifest.private !== true && !exclude.has(row.name);
});

const ordered = [];
const seen = new Set();
function visit(row) {
	if (seen.has(row.location)) return;
	seen.add(row.location);
	for (const dep of row.workspaceDependencies ?? []) {
		const depRow = byLocation.get(dep);
		if (depRow) visit(depRow);
	}
	if (pending.includes(row)) ordered.push(row);
}
pending.forEach(visit);

// ── Pack with yarn, publish with npm ──────────────────────────────────────────
const outDir = mkdtempSync(join(tmpdir(), 'bcore-publish-'));
let published = 0;

for (const row of ordered) {
	const { name } = row;
	const { version } = JSON.parse(readFileSync(join(row.location, 'package.json'), 'utf-8'));

	let exists = false;
	try {
		run('npm', ['view', `${name}@${version}`, 'version'], { stdio: ['ignore', 'pipe', 'ignore'] });
		exists = true;
	} catch { /* not on the registry yet — publish it */ }

	if (exists) {
		console.log(`skip    ${name}@${version} — already published`);
		continue;
	}

	const tarball = join(outDir, `${name.replace(/[@/]/g, '_')}.tgz`);
	run('yarn', ['workspace', name, 'pack', '--out', tarball], { stdio: 'inherit' });
	run('npm', ['publish', tarball], { stdio: 'inherit' });
	console.log(`publish ${name}@${version}`);
	published++;
}

console.log(`${published} published, ${ordered.length - published} already current`);
