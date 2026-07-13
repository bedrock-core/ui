/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * `@bedrock-core/config` — the addon list + config + guide UI every bedrock-core
 * addon mounts with one line:
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { ui } from '@bedrock-core/config';
 *
 * core.register({ ... });
 * core.translations.provide(translationKeys);
 * core.guide(guides);               // optional
 * ui(core);                         // registers the commands, first-wins across realms
 * ```
 *
 * `ui(core)` registers the `core:list`/`core:guide`/`core:config` commands (first-wins
 * across realms — see `commands.ts`); the winning realm renders the UI for every addon,
 * since the registry, config schemas, guides, and translation keys all replicate over sync.
 * No runtime-side seam is involved: this UI package simply imports the runtime it needs.
 */
import { render } from '@bedrock-core/ui-runtime';
import type { Runtime } from '@bedrock-core/server-runtime';
import { registerRuntimeCommands } from './commands';
import { App } from './App';

/**
 * Mount the shared config UI on a runtime. Call once, after `core.register()`. Registers the
 * three commands (first-wins across realms); the winning realm renders the UI for every addon.
 */
export function ui(core: Runtime): void {
  registerRuntimeCommands((player, target) => render(<App core={core} player={player} target={target} />, player));
}

/** Back-compat alias for {@link ui}. */
export const setupConfigUI = ui;

export { App } from './App';
export type { AppProps } from './App';
export type { AppRoutes, AppScreen, ConfigScope, EntrySchema } from './routes';
