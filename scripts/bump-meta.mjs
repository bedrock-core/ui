#!/usr/bin/env node
/**
 * Bump the root `@bedrock-core/ui` meta package.
 *
 * Changesets can only manage `packages/*` workspaces — the repo root
 * (`@bedrock-core/ui`) is invisible to it — so the meta's version is derived
 * here, immediately after `changeset version`.
 *
 * The rule: **the meta's MAJOR.MINOR is `@bedrock-core/ui-runtime`'s.** The
 * runtime is what the meta *is*; every other package it re-exports is support
 * around it. So:
 *
 *   runtime line moved (0.10.x → 0.11.x, 0.x → 1.x) → meta jumps to <line>.0
 *   anything else changed, at any level             → meta patch
 *   nothing changed                                 → no-op
 *
 * A minor on `config` or a major on `flexbox` is a *patch* to the meta: what
 * ships is the meta's support for that package, not a new framework line. That
 * also removes the old `MAX_BUMP` clamp — the meta can't outrun the runtime, so
 * a dependency reaching 1.0.0 no longer drags the framework with it, and
 * `@bedrock-core/ui` 1.0.0 is exactly `@bedrock-core/ui-runtime` 1.0.0.
 *
 * The line only ever moves **forward**. npm can't unpublish, so a meta sitting
 * ahead of the runtime holds where it is, patching, until the runtime's line
 * catches up — from then on the two are pinned.
 *
 * The meta's `workspace:*` dependency ranges are left untouched;
 * `publish-tarballs.mjs` resolves them to concrete versions at pack time.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** The package whose MAJOR.MINOR the meta's version *is*. */
const RUNTIME_PATH = 'packages/ui-runtime/package.json';

/** The root meta's real (non-peer) dependencies, in `packages/<dir>` form. */
const META_DEP_DIRS = [
	'config',
	'flexbox',
	'guides',
	'i18n',
	'navigation',
	'ore-styled',
	'ui-runtime',
];

const readVersion = (json) => JSON.parse(json).version;
const currentVersion = (path) => readVersion(readFileSync(path, 'utf8'));

/** Version of a package.json at git HEAD, or null if it isn't committed yet. */
function headVersion(path) {
	try {
		return readVersion(execSync(`git show HEAD:${path}`, { encoding: 'utf8' }));
	} catch {
		return null;
	}
}

/** `1.2.3` → `[1, 2, 3]`. */
function parse(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version ?? '');

	if (!match) throw new Error(`bump-meta: cannot parse the version "${version}"`);

	return match.slice(1, 4).map(Number);
}

/** Is `a`'s MAJOR.MINOR strictly ahead of `b`'s? */
const lineAhead = (a, b) => (a[0] === b[0] ? a[1] > b[1] : a[0] > b[0]);

const meta = parse(currentVersion('package.json'));
const runtime = parse(currentVersion(RUNTIME_PATH));

let next;

if (lineAhead(runtime, meta)) {
	next = `${runtime[0]}.${runtime[1]}.0`;
	console.log(`bump-meta: ui-runtime line → ${runtime[0]}.${runtime[1]} — the meta follows it.`);
} else {
	// A dependency that isn't committed yet (headVersion null) is new, not changed.
	const changed = META_DEP_DIRS.filter((dir) => {
		const path = `packages/${dir}/package.json`;
		const head = headVersion(path);

		return head !== null && head !== currentVersion(path);
	});

	if (changed.length === 0) {
		console.log('bump-meta: no @bedrock-core/ui dependency changed — meta not bumped.');
		process.exit(0);
	}

	next = `${meta[0]}.${meta[1]}.${meta[2] + 1}`;
	console.log(`bump-meta: support for ${changed.join(', ')} — meta patch.`);
}

execSync(`npm version ${next} --no-git-tag-version --allow-same-version`, { stdio: 'inherit' });
console.log(`bump-meta: @bedrock-core/ui ${meta.join('.')} → ${currentVersion('package.json')}`);
