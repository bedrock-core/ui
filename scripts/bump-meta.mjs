#!/usr/bin/env node
/**
 * Bump the root `@bedrock-core/ui` meta package.
 *
 * Changesets can only manage `packages/*` workspaces — the repo root
 * (`@bedrock-core/ui`) is invisible to it. This script runs right after
 * `changeset version` and gives the meta the correct bump derived from its own
 * dependencies: for each dep it compares the freshly-versioned working-tree
 * version against the committed (`HEAD`) version and applies the *largest* bump
 * any of them received.
 *
 *   any dep majored → meta major
 *   else any minored → meta minor
 *   else any patched → meta patch
 *   else            → no-op (nothing changed)
 *
 * The result is then clamped to {@link MAX_BUMP}: individual packages reach 1.0.0
 * on their own schedule, but the meta version is what people read as "is the
 * framework stable?", so it only leaves 0.x deliberately.
 *
 * The meta's `workspace:*` dependency ranges are left untouched; `yarn npm
 * publish` resolves them to concrete versions at pack time.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** The root meta's real (non-peer) dependencies, in `packages/<dir>` form. */
const META_DEP_DIRS = [
	'config',
	'flexbox',
	'guides',
	'navigation',
	'ore-styled',
	'ui-runtime',
];

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const LEVEL = ['none', 'patch', 'minor', 'major'];

/**
 * Highest bump the meta may take. Set to `'minor'` while `@bedrock-core/ui` is in
 * beta so a dependency reaching 1.0.0 (e.g. `flexbox`) doesn't drag the whole
 * framework to 1.0.0 with it. Raise to `'major'` when the meta is ready to ship
 * 1.0.0 — that release is a deliberate, one-off call, not a derived one.
 */
const MAX_BUMP = 'minor';

const readVersion = (json) => JSON.parse(json).version;

/** Version of a package.json at git HEAD, or null if it isn't committed yet. */
function headVersion(path) {
	try {
		return readVersion(execSync(`git show HEAD:${path}`, { encoding: 'utf8' }));
	} catch {
		return null;
	}
}

/** Classify old→new as none/patch/minor/major (works for 0.x too). */
function bumpRank(oldV, newV) {
	if (!oldV || oldV === newV) return RANK.none;
	const [oMajor, oMinor] = oldV.split('.').map(Number);
	const [nMajor, nMinor] = newV.split('.').map(Number);
	if (nMajor > oMajor) return RANK.major;
	if (nMinor > oMinor) return RANK.minor;
	return RANK.patch;
}

let maxRank = RANK.none;
for (const dir of META_DEP_DIRS) {
	const path = `packages/${dir}/package.json`;
	const current = readVersion(readFileSync(path, 'utf8'));
	maxRank = Math.max(maxRank, bumpRank(headVersion(path), current));
}

if (maxRank === RANK.none) {
	console.log('bump-meta: no @bedrock-core/ui dependency changed — meta not bumped.');
	process.exit(0);
}

const cappedRank = Math.min(maxRank, RANK[MAX_BUMP]);
if (cappedRank !== maxRank) {
	console.log(`bump-meta: capping ${LEVEL[maxRank]} → ${LEVEL[cappedRank]} (MAX_BUMP).`);
}

const level = LEVEL[cappedRank];
execSync(`npm version ${level} --no-git-tag-version`, { stdio: 'inherit' });
const next = readVersion(readFileSync('package.json', 'utf8'));
console.log(`bump-meta: @bedrock-core/ui bumped (${level}) → ${next}`);
