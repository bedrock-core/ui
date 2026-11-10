import type { Declaration, Installation, Runtime } from '@bedrock-core/server-runtime';

/** Exercise declarations through their public installation and owned-cleanup contract. */
export function installDeclaration<T>(core: Runtime, declaration: Declaration<T>, cleanups: (() => void)[]): T {
  const deferred: (() => void)[] = [];
  let result: Installation<T> | undefined;
  let stopped = false;

  const stop = (): void => {
    if (stopped) { return; }

    stopped = true;
    const failures: unknown[] = [];

    for (const release of [...result?.stop ? [result.stop] : [], ...deferred.splice(0).reverse()]) {
      try { release(); } catch (error) { failures.push(error); }
    }

    if (failures.length === 1) { throw failures[0]; }

    if (failures.length) { throw new AggregateError(failures, 'installation cleanup failed'); }
  };

  cleanups.push(stop);

  try {
    result = declaration.install(core, { defer: release => deferred.push(release) });

    if (!Object.hasOwn(result, 'value')) { throw new TypeError('installation must return { value, stop? }'); }

    return result.value;
  } catch (error) {
    stop();
    throw error;
  }
}

export function stopInstallations(cleanups: (() => void)[]): void {
  const failures: unknown[] = [];

  for (const stop of cleanups.splice(0).reverse()) {
    try { stop(); } catch (error) { failures.push(error); }
  }

  if (failures.length === 1) { throw failures[0]; }

  if (failures.length) { throw new AggregateError(failures, 'installation cleanup failed'); }
}
