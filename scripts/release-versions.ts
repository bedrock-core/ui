import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const UI = '@bedrock-core/ui';
const RUNTIME = '@bedrock-core/ui-runtime';
const NAVIGATION = '@bedrock-core/navigation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readObject(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (!isRecord(value)) {
    throw new Error(`release-versions: expected a JSON object in ${path}`);
  }

  return value;
}

function manifestVersion(manifest: Record<string, unknown>, name: string): string {
  if (manifest.name !== name || typeof manifest.version !== 'string' || !manifest.version) {
    throw new Error(`release-versions: expected a named, versioned manifest for ${name}`);
  }

  return manifest.version;
}

function runtimeReleaseVersion(cwd: string): string {
  const runtime = readObject(join(cwd, 'packages/ui-runtime/package.json'));
  const navigation = readObject(join(cwd, 'packages/navigation/package.json'));
  const version = manifestVersion(runtime, RUNTIME);

  manifestVersion(navigation, NAVIGATION);

  for (const manifest of [readObject(join(cwd, 'package.json')), navigation]) {
    const dependencies = manifest.dependencies;

    if (!isRecord(dependencies) || dependencies[RUNTIME] !== 'workspace:*') {
      throw new Error(`release-versions: ${String(manifest.name)} must pin ${RUNTIME} through workspace:*`);
    }
  }

  return version;
}

/** The UI umbrella mirrors its runtime; navigation has an independent version. */
export function checkReleaseVersions(cwd = process.cwd()): string {
  const version = runtimeReleaseVersion(cwd);
  const rootVersion = manifestVersion(readObject(join(cwd, 'package.json')), UI);

  if (rootVersion !== version) {
    throw new Error(`release-versions: ${UI}@${rootVersion} must match ${RUNTIME}@${version}`);
  }

  return version;
}

/** Changesets versions child workspaces; the root mirrors the runtime result. */
export function syncMetaVersion(cwd = process.cwd()): { previous: string; version: string; changed: boolean } {
  const version = runtimeReleaseVersion(cwd);
  const path = join(cwd, 'package.json');
  const previous = manifestVersion(readObject(path), UI);

  if (previous !== version) {
    const contents = readFileSync(path, 'utf8');
    const versionField = /("version"\s*:\s*")([^"]*)(")/;

    writeFileSync(path, contents.replace(versionField, (_match, prefix: string, _previous: string, suffix: string) => `${prefix}${version}${suffix}`));
  }

  checkReleaseVersions(cwd);

  return { previous, version, changed: previous !== version };
}
