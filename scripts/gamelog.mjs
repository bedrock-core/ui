// What the client had to say about the last session, filtered to what
// matters: every assertion — the Marketplace review client runs with them
// enabled, so one is a rejection whatever a release build shows — and every
// `[ui]` line our own scripts logged. Read after every in-game pass.
//
//   yarn gamelog          the newest debug log (assertions + [ui] lines)
//   yarn gamelog --all    every assertion in every debug log, oldest first
//
// The logs folder is found from the usual Bedrock locations, or taken from
// BC_GAME_LOGS when the game keeps its data elsewhere.

import fs from 'node:fs';
import path from 'node:path';

const flags = new Set(process.argv.slice(2));

const candidates = [
  process.env.BC_GAME_LOGS,
  process.env.APPDATA && path.join(process.env.APPDATA, 'Minecraft Bedrock', 'logs'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Packages', 'Microsoft.MinecraftUWP_8wekyb3d8bbwe', 'LocalState', 'logs'),
].filter(Boolean);

const logs = candidates.find(dir => fs.existsSync(dir));

if (logs === undefined) {
  console.error('✖ gamelog: no Bedrock logs folder found — set BC_GAME_LOGS');
  process.exit(1);
}

const newest = (prefix) => fs.readdirSync(logs)
  .filter(name => name.startsWith(prefix) && name.endsWith('.txt'))
  .map(name => ({ name, time: fs.statSync(path.join(logs, name)).mtimeMs }))
  .sort((a, b) => b.time - a.time)
  .map(entry => entry.name);

const linesOf = (file) => fs.readFileSync(path.join(logs, file), 'utf-8').split(/\r?\n/);

/** A log line without its `[time LEVEL AREA pid tid]` prefix. */
const bare = (line) => line.replace(/^\[[^\]]*\]\s*/, '');

/**
 * Every assertion in one debug log with the condition and function that follow
 * it, keyed without the timestamp so one assertion firing every frame collapses
 * to one entry and a count.
 */
const assertions = (file) => {
  const lines = linesOf(file);
  const found = new Map();

  lines.forEach((line, index) => {
    if (line.includes('Assertion failed')) {
      const key = [bare(line), ...lines.slice(index + 1, index + 3)].join('\n   ');

      found.set(key, (found.get(key) ?? 0) + 1);
    }
  });

  return found;
};

/** Count the engine-wide FocusManager diagnostic on the form host without failing the release gate. */
const focusErrors = (file) => {
  const found = new Map();

  for (const line of linesOf(file)) {
    if (
      !line.includes("FocusComponent's visual tree pointer seems to be dangling")
      || !line.includes('referencing screen: third_party_server_screen')
    ) {
      continue;
    }

    const key = bare(line);

    found.set(key, (found.get(key) ?? 0) + 1);
  }

  return found;
};

/** What our own scripts logged: `[ui]` lines land in the debug log under SCRIPTING. */
const scriptLines = (file) => linesOf(file)
  .filter(line => line.includes('[ui]'))
  .map(line => bare(line).replace(/^\[Scripting\]\s*/, ''));

const debugLogs = newest('Debug_Log');

if (debugLogs.length === 0) {
  console.error(`✖ gamelog: no Debug_Log*.txt under ${logs} — is logging enabled in the game's settings?`);
  process.exit(1);
}

const scanned = flags.has('--all') ? debugLogs.slice().reverse() : debugLogs.slice(0, 1);
let total = 0;

for (const file of scanned) {
  const found = assertions(file);
  const fired = [...found.values()].reduce((sum, count) => sum + count, 0);
  const focus = focusErrors(file);
  const focusFired = [...focus.values()].reduce((sum, count) => sum + count, 0);

  total += fired;

  if (fired > 0 || focusFired > 0 || !flags.has('--all')) {
    console.info(
      `\n${file}: ${found.size} distinct assertion(s), fired ${fired} time(s); `
      + `${focus.size} distinct FocusManager diagnostic(s), fired ${focusFired} time(s)`,
    );
  }

  for (const [entry, count] of found) {
    console.info(`\n×${count} ${entry}`);
  }

  for (const [entry, count] of focus) {
    console.info(`\n×${count} ${entry}`);
  }
}

if (!flags.has('--all')) {
  const ours = scriptLines(debugLogs[0]);

  console.info(`\n${debugLogs[0]}: ${ours.length} [ui] line(s)`);

  for (const line of ours) {
    console.info(`  ${line}`);
  }

  const [contentLog] = newest('ContentLog');

  if (contentLog !== undefined) {
    const problems = linesOf(contentLog)
      .filter(line => (
        /\[(Scripting|Packs)\]\[(error|warning)\]/.test(line)
        && !line.includes('Custom Command alias')
      ));

    if (problems.length > 0) {
      total += problems.length;
      console.info(`\n${contentLog}: ${problems.length} pack/script error/warning line(s)`);

      for (const line of problems) {
        console.info(`  ${line}`);
      }
    }
  }
}

console.info(total === 0
  ? '\n✔ no release-blocking log errors'
  : `\n✖ ${total} release-blocking log error(s)`);
process.exit(total === 0 ? 0 : 1);
