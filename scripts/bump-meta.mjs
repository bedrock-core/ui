#!/usr/bin/env node
/**
 * Version the root `@bedrock-core/ui` meta package.
 *
 * Changesets can only manage `packages/*` workspaces — the repo root (`@bedrock-core/ui`) is
 * invisible to it — so the meta's version is set here, immediately after `changeset version`.
 *
 * The rule: **the meta's version IS `@bedrock-core/ui-runtime`'s**, character for character,
 * prerelease tag included. The runtime is what the meta is; every other package it re-exports is
 * support around it. So `@bedrock-core/ui@1.0.0-rc.1` is `@bedrock-core/ui-runtime@1.0.0-rc.1`,
 * and a consumer reading either number is reading the same one.
 *
 * A release the runtime does not move leaves the meta where it is: what shipped was a package the
 * meta curates, and the curated set is republished with the runtime that next moves.
 *
 * The meta's `workspace:*` dependency ranges are left untouched; `publish-tarballs.mjs` resolves
 * them to concrete versions at pack time.
 *
 * Idempotent: re-running with the meta already on the runtime's version is a no-op.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const META_PATH = 'package.json';

/** The package whose version the meta's version *is*. */
const RUNTIME_PATH = 'packages/ui-runtime/package.json';

/** Matches the manifest's version field, capturing the quoted value so only it is replaced. */
const VERSION_FIELD = /("version"\s*:\s*")([^"]*)(")/;

const currentVersion = (path) => JSON.parse(readFileSync(path, 'utf8')).version;

const written = currentVersion(META_PATH);
const next = currentVersion(RUNTIME_PATH);

if (next === written) {
	console.log(`bump-meta: @bedrock-core/ui already ${written} — no change.`);
	process.exit(0);
}

const manifest = readFileSync(META_PATH, 'utf8');

if (!VERSION_FIELD.test(manifest)) {
	throw new Error(`bump-meta: could not find the version field in ${META_PATH}`);
}

// Tabs — this manifest is tab-indented; a targeted replace preserves that.
writeFileSync(META_PATH, manifest.replace(VERSION_FIELD, `$1${next}$3`));
console.log(`bump-meta: @bedrock-core/ui ${written} → ${next}, matching @bedrock-core/ui-runtime.`);
