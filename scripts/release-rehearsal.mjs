#!/usr/bin/env node
// Release rehearsal: prove the next release resolves on npm without publishing to npm.
//
// What it does:
//   1. Clones the committed state of this repo (and ../server-public if present)
//      into a temp dir, preserving the sibling layout the portal: resolutions need.
//   2. Installs, applies the pending changesets (version-packages), builds.
//   3. Starts a throwaway Verdaccio registry that proxies registry.npmjs.org.
//   4. Publishes every public package to it with the same tool the real
//      pipeline uses (changeset publish; --publisher yarn for the yarn flow).
//   5. Installs each published package from a clean consumer project against
//      the local registry and scans the installed tree for workspace:/portal:
//      protocol leaks and unresolvable ranges.
//
// Nothing here can reach the real registry: publishes go to localhost and the
// consumer's .npmrc points at localhost (which proxies reads from npmjs).
//
// Usage: node scripts/release-rehearsal.mjs
//   [--no-server]           rehearse the ui repo alone
//   [--server-root <path>]  server repo checkout (default: sibling server-public)
//   [--publisher changeset|yarn]  publish command to rehearse (default: changeset)
//   [--port <n>]            registry port (default: 4873)
//   [--keep]                keep the temp dir for inspection

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, def) => {
	const i = argv.indexOf(name);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const uiRoot = resolve(opt('--ui-root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const serverRoot = flag('--no-server') ? null : resolve(opt('--server-root', join(uiRoot, '..', 'server-public')));
const publisher = opt('--publisher', 'changeset');
const port = Number(opt('--port', '4873'));
const registry = `http://localhost:${port}`;

const results = [];
let verdaccio = null;
let tmp = null;

const log = (msg) => console.log(`\n[rehearsal] ${msg}`);

// All child processes get a fake NPM_TOKEN so yarnrc "${NPM_TOKEN}" interpolation
// never hard-fails, and can never carry a real credential into a publish.
const baseEnv = { ...process.env, NPM_TOKEN: 'rehearsal-fake-token' };

function run(cmd, args, { cwd, env = {}, allowFail = false } = {}) {
	const pretty = `${cmd} ${args.join(' ')}`;
	console.log(`  $ ${pretty}  (${cwd})`);
	const res = spawnSync(cmd, args, {
		cwd,
		env: { ...baseEnv, ...env },
		stdio: ['ignore', 'pipe', 'pipe'],
		shell: process.platform === 'win32',
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
	if (res.status !== 0 && !allowFail) {
		console.error(out.slice(-4000));
		throw new Error(`command failed (${res.status}): ${pretty}`);
	}
	return { status: res.status, out };
}

function cloneRepo(src, dst) {
	// --local clone of the checkout: rehearses exactly the committed HEAD.
	const dirty = run('git', ['status', '--porcelain'], { cwd: src }).out.trim();
	if (dirty) console.warn(`  ! ${src} has uncommitted changes — they are NOT part of this rehearsal`);
	run('git', ['clone', '--quiet', '--local', '--no-hardlinks', src, dst], { cwd: tmpdir() });
}

function listPublicPackages(repoRoot) {
	const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
	const dirs = [repoRoot];
	for (const g of rootPkg.workspaces ?? []) {
		// workspace globs in these repos are plain "packages/<name>" entries or "packages/*"
		if (g.endsWith('/*')) {
			const base = join(repoRoot, g.slice(0, -2));
			if (existsSync(base)) for (const d of readdirSync(base)) dirs.push(join(base, d));
		} else {
			dirs.push(join(repoRoot, g));
		}
	}
	const pkgs = [];
	for (const dir of dirs) {
		const file = join(dir, 'package.json');
		if (!existsSync(file)) continue;
		const pkg = JSON.parse(readFileSync(file, 'utf8'));
		if (!pkg.private && pkg.name) pkgs.push({ name: pkg.name, version: pkg.version, dir });
	}
	return pkgs;
}

async function waitForRegistry() {
	for (let i = 0; i < 60; i++) {
		try {
			const r = await fetch(`${registry}/-/ping`);
			if (r.ok) return;
		} catch { /* not up yet */ }
		await new Promise((t) => setTimeout(t, 1000));
	}
	throw new Error('verdaccio did not become ready within 60s');
}

function startVerdaccio() {
	const storage = join(tmp, 'verdaccio-storage');
	const cfg = join(tmp, 'verdaccio.yaml');
	writeFileSync(cfg, [
		`storage: ${storage.replaceAll('\\', '/')}`,
		'auth:',
		'  htpasswd:',
		`    file: ${join(tmp, 'htpasswd').replaceAll('\\', '/')}`,
		'uplinks:',
		'  npmjs:',
		'    url: https://registry.npmjs.org/',
		'packages:',
		"  '@bedrock-core/*':",
		'    access: $all',
		'    publish: $all',
		'    proxy: npmjs',
		"  '**':",
		'    access: $all',
		'    proxy: npmjs',
		'max_body_size: 200mb',
		'log: { type: stdout, format: pretty, level: warn }',
	].join('\n'));
	verdaccio = spawn('npx', ['--yes', 'verdaccio@6', '--config', cfg, '--listen', String(port)], {
		env: baseEnv,
		stdio: ['ignore', 'inherit', 'inherit'],
		shell: process.platform === 'win32',
	});
}

function stopVerdaccio() {
	if (!verdaccio) return;
	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/pid', String(verdaccio.pid), '/T', '/F'], { stdio: 'ignore', shell: true });
	} else {
		verdaccio.kill('SIGTERM');
	}
	verdaccio = null;
}

function installRepo(repoRoot) {
	// Point every npm-client operation in this clone at the local registry.
	writeFileSync(join(repoRoot, '.npmrc'), [
		`registry=${registry}/`,
		`//localhost:${port}/:_authToken=rehearsal-fake-token`,
	].join('\n'));
	// The github changelog generator needs a GITHUB_TOKEN; a rehearsal doesn't
	// need changelogs at all.
	const changesetConfigPath = join(repoRoot, '.changeset', 'config.json');
	const changesetConfig = JSON.parse(readFileSync(changesetConfigPath, 'utf8'));
	changesetConfig.changelog = false;
	writeFileSync(changesetConfigPath, JSON.stringify(changesetConfig, null, 2));
	run('yarn', ['install'], { cwd: repoRoot, env: { YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' } });
}

function versionRepo(repoRoot) {
	run('yarn', ['version-packages'], { cwd: repoRoot });
	run('yarn', ['install'], { cwd: repoRoot, env: { YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' } });
}

function publishRepo(repoRoot) {
	if (publisher === 'yarn') {
		run('yarn', ['workspaces', 'foreach', '-A', '--no-private', '--topological', 'npm', 'publish', '--tolerate-republish'], {
			cwd: repoRoot,
			env: {
				YARN_NPM_PUBLISH_REGISTRY: registry,
				YARN_UNSAFE_HTTP_WHITELIST: 'localhost',
				YARN_NPM_ALWAYS_AUTH: 'false',
			},
		});
	} else {
		// The real pipeline: changeset publish shells out to npm, which reads
		// the .npmrc written by prepareRepo.
		run('yarn', ['changeset', 'publish', '--no-git-tag'], {
			cwd: repoRoot,
			env: { npm_config_registry: `${registry}/` },
		});
	}
}

function installCheck(pkg) {
	const safe = pkg.name.replace(/[^a-z0-9-]/gi, '_');
	const dir = join(tmp, 'consumer', safe);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: `consume-${safe}`, private: true }, null, 2));
	writeFileSync(join(dir, '.npmrc'), `registry=${registry}/\n`);
	const res = run('npm', ['install', `${pkg.name}@${pkg.version}`, '--no-audit', '--no-fund', '--loglevel=error'], {
		cwd: dir,
		allowFail: true,
	});
	if (res.status !== 0) {
		results.push({ pkg: `${pkg.name}@${pkg.version}`, ok: false, why: res.out.trim().split('\n').slice(-8).join(' | ') });
		return;
	}
	// Scan the installed tree for monorepo protocols that must never reach npm.
	const leaks = [];
	const scopeDir = join(dir, 'node_modules', '@bedrock-core');
	if (existsSync(scopeDir)) {
		for (const name of readdirSync(scopeDir)) {
			const file = join(scopeDir, name, 'package.json');
			if (!existsSync(file)) continue;
			const manifest = JSON.parse(readFileSync(file, 'utf8'));
			for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
				for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
					if (/^(workspace|portal|file|link):/.test(range)) leaks.push(`${name} ${field} ${dep}=${range}`);
				}
			}
		}
	}
	results.push(leaks.length
		? { pkg: `${pkg.name}@${pkg.version}`, ok: false, why: `protocol leak: ${leaks.join('; ')}` }
		: { pkg: `${pkg.name}@${pkg.version}`, ok: true, why: '' });
}

async function main() {
	if (serverRoot && !existsSync(join(serverRoot, 'package.json'))) {
		throw new Error(`server repo not found at ${serverRoot} — pass --server-root or --no-server`);
	}
	tmp = mkdtempSync(join(tmpdir(), 'bcore-rehearsal-'));
	log(`temp workspace: ${tmp}`);

	// Sibling names must match the portal: paths (../ui, ../server-public).
	const uiClone = join(tmp, 'ui');
	const serverClone = serverRoot ? join(tmp, 'server-public') : null;
	log('cloning committed state');
	cloneRepo(uiRoot, uiClone);
	if (serverClone) cloneRepo(serverRoot, serverClone);

	// Both repos must be fully installed before either versions or builds:
	// the portal: resolutions make each repo type-check the other's sources,
	// which needs the other side's node_modules in place.
	const clones = [uiClone, serverClone].filter(Boolean);
	log('installing');
	for (const clone of clones) installRepo(clone);
	log('versioning (applying changesets)');
	for (const clone of clones) versionRepo(clone);
	log('building');
	for (const clone of clones) run('yarn', ['build:libs'], { cwd: clone });

	log(`starting throwaway registry on ${registry}`);
	startVerdaccio();
	await waitForRegistry();

	log(`publishing with "${publisher}" flow (localhost only)`);
	publishRepo(uiClone);
	if (serverClone) publishRepo(serverClone);

	const pkgs = [...listPublicPackages(uiClone), ...(serverClone ? listPublicPackages(serverClone) : [])];
	log(`install-checking ${pkgs.length} packages from a clean consumer`);
	for (const pkg of pkgs) installCheck(pkg);

	log('results');
	const width = Math.max(...results.map((r) => r.pkg.length));
	for (const r of results) {
		console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.pkg.padEnd(width)}  ${r.why}`);
	}
	const failed = results.filter((r) => !r.ok);
	console.log(`\n${results.length - failed.length}/${results.length} packages resolve correctly`);
	if (failed.length) process.exitCode = 1;
}

try {
	await main();
} finally {
	stopVerdaccio();
	if (tmp && !flag('--keep')) {
		try { rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows file locks; temp dir, OS cleans up */ }
	} else if (tmp) {
		log(`kept temp workspace: ${tmp}`);
	}
}
