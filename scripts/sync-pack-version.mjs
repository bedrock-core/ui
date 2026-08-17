#!/usr/bin/env node
/**
 * Version the render pack from the release it ships in.
 *
 * The pack is not published to npm — it is the `.mcpack` attached to each
 * `@bedrock-core/ui` release — so its version has one job: let a user tell
 * which library release a pack belongs to, and which of two packs is newer.
 *
 * The rule, which the numbers have loosely followed since 0.8.x and this makes
 * exact:
 *
 *   pack MAJOR = meta major + 1     (the pack was 1.x while the meta was 0.x;
 *                                    +1 keeps it monotonic when the meta
 *                                    reaches 1.0.0 — a bare mirror would send
 *                                    the pack 1.10.x → 1.0.x, and Bedrock must
 *                                    never see a pack version go down)
 *   pack MINOR = meta minor         (pack 1.10.x ships with @bedrock-core/ui
 *                                    0.10.x — readable straight off the pack)
 *   pack PATCH = pack revisions within that release line
 *
 * Everything that changes the pack meaningfully — a new texture, a new
 * component leaf, a protocol change — arrives in a release whose meta minor
 * bumps, so it lands on the pack's minor too. A pack-only fix shipped inside an
 * existing line takes the patch, detected by hashing the pack's own source.
 *
 * The PROTOCOL is a separate fact, not encoded in the number: it is recorded in
 * `protocol.json` and written into the pack description, which is the only
 * place a player can read it in-game.
 *
 * Runs inside `yarn version-packages`, AFTER `bump-meta.mjs` has settled the
 * meta version. Exits non-zero if the protocol or meta version cannot be read.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const SERIALIZER = 'packages/ui-runtime/src/core/serializer.ts';
const PACK = 'packages/resource-pack/packs/RP';
const MANIFEST = `${PACK}/manifest.json`;
const LANG = `${PACK}/texts/en_US.lang`;
const RECORD = 'packages/resource-pack/protocol.json';

/** The single source of truth for the wire format: `export const VERSION = 'v0008';` */
const versionMatch = /export const VERSION\s*=\s*'(v\d+)'/.exec(readFileSync(SERIALIZER, 'utf8'));

if (!versionMatch) {
	console.error(`sync-pack-version: could not read VERSION from ${SERIALIZER}`);
	process.exit(1);
}

const [, protocol] = versionMatch;
const metaVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const metaMatch = /^(\d+)\.(\d+)\./.exec(metaVersion);

if (!metaMatch) {
	console.error(`sync-pack-version: could not parse the meta version "${metaVersion}"`);
	process.exit(1);
}

const targetMajor = Number(metaMatch[1]) + 1;
const targetMinor = Number(metaMatch[2]);

/** Every file under the pack, in stable order. */
function packFiles(dir) {
	const out = [];

	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);

		if (statSync(path).isDirectory()) { out.push(...packFiles(path)); }
		else { out.push(path); }
	}

	return out.sort();
}

/**
 * Content hash of the pack's source, used to catch pack-only revisions. The
 * manifest is hashed with its version stripped: that is the field being
 * written, so including it would make every run see a change and bump forever.
 */
function hashPack() {
	const hash = createHash('sha256');

	for (const path of packFiles(PACK)) {
		const key = relative(PACK, path).split(sep).join(posix.sep);

		hash.update(key);

		if (key === 'manifest.json') {
			const manifest = JSON.parse(readFileSync(path, 'utf8'));

			delete manifest.header.version;
			hash.update(JSON.stringify(manifest));
		} else {
			hash.update(readFileSync(path));
		}
	}

	return hash.digest('hex');
}

// Sync the player-visible protocol first, so it counts as pack content below.
const lang = readFileSync(LANG, 'utf8');
const described = lang.replace(/^pack\.description=.*$/m, (line) => {
	const base = line.replace(/^pack\.description=/, '').replace(/\s+—\s+protocol v\d+$/, '');

	return `pack.description=${base} — protocol ${protocol}`;
});

if (described !== lang) {
	writeFileSync(LANG, described);
	console.log(`sync-pack-version: pack.description → protocol ${protocol}`);
}

// Tabs — the pack files are tab-indented; preserve it.
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const [major, minor, patch] = manifest.header.version;
const packHash = hashPack();
const record = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf8')) : {};

let next;
let why;

if (major !== targetMajor || minor !== targetMinor) {
	// A new release line resets the patch.
	next = [targetMajor, targetMinor, 0];
	why = `release line → @bedrock-core/ui ${metaVersion}`;
} else if (record.packHash !== packHash) {
	next = [major, minor, patch + 1];
	why = `pack content changed within ${major}.${minor}`;
} else {
	console.log(`sync-pack-version: pack ${major}.${minor}.${patch} unchanged (protocol ${protocol}).`);
	process.exit(0);
}

manifest.header.version = next;
writeFileSync(MANIFEST, JSON.stringify(manifest, null, '\t') + '\n');
// Re-hash so the record describes the pack as it now stands.
writeFileSync(
	RECORD,
	JSON.stringify({ protocol, packVersion: next, packHash: hashPack() }, null, '\t') + '\n',
);
console.log(`sync-pack-version: ${why} — pack ${major}.${minor}.${patch} → ${next.join('.')} (protocol ${protocol})`);
