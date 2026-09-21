import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Reuse the exact archive checked by the clean-install gate. Repacking here
// would sever that guarantee and could hide missing template files.
export function verifiedCliTarball(version, env = process.env) {
  const file = env.BEDROCK_CLI_TARBALL;
  const reportFile = env.BEDROCK_CLI_SMOKE_SUMMARY;
  if (!file || !reportFile) {
    throw new Error('CLI publication requires BEDROCK_CLI_TARBALL and BEDROCK_CLI_SMOKE_SUMMARY from scripts/smoke-cli.mjs.');
  }
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (report.passed !== true || report.version !== version || report.sha256 !== sha256
    || !Array.isArray(report.projects)
    || !['npm', 'yarn', 'pnpm'].every(manager => report.projects.some(project => project.manager === manager && project.passed === true))) {
    throw new Error('The CLI tarball does not match a passing npm/Yarn/pnpm smoke report for this version.');
  }
  return resolve(file);
}
