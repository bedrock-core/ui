#!/usr/bin/env node
/**
 * Tag the root `@bedrock-core/ui` meta package at its current version.
 *
 * `changeset tag` only tags the workspaces changesets manages, and the repo root
 * is not one of them — so the meta's tag is created here, after the release has
 * published it. Idempotent: an existing tag is left alone.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = `${name}@${version}`;

try {
	execSync(`git rev-parse -q --verify "refs/tags/${tag}"`, { stdio: 'ignore' });
	console.log(`tag-meta: ${tag} already tagged.`);
} catch {
	execSync(`git tag "${tag}"`, { stdio: 'inherit' });
	console.log(`tag-meta: tagged ${tag}`);
}
