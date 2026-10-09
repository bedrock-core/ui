import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface PackComparison {
  files: number;
  digest: string;
  missing: string[];
  changed: string[];
  extra: string[];
}

const packFiles = (directory: string): Map<string, string> => {
  const files = new Map<string, string>();

  const visit = (relative: string): void => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        visit(name);
      } else if (entry.isFile()) {
        files.set(name, createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex'));
      } else {
        throw new Error(`Unsupported pack entry: ${name}`);
      }
    }
  };

  visit('');

  return files;
};

/** Compare the complete exported resource pack with its development deployment. */
export function comparePackContents(builtDirectory: string, deployedDirectory: string): PackComparison {
  const built = packFiles(builtDirectory);

  if (!built.has('manifest.json')) {
    throw new Error('The built resource pack has no manifest.json');
  }

  const deployed = packFiles(deployedDirectory);
  const names = [...built.keys()].sort();
  const digest = createHash('sha256');

  for (const name of names) {
    digest.update(name).update('\0').update(built.get(name)!).update('\0');
  }

  return {
    files: names.length,
    digest: digest.digest('hex'),
    missing: names.filter(name => !deployed.has(name)),
    changed: names.filter(name => deployed.has(name) && deployed.get(name) !== built.get(name)),
    extra: [...deployed.keys()].filter(name => !built.has(name)).sort(),
  };
}
