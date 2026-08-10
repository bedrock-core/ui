/**
 * `@bedrock-core/config` — the addon list + config + guide UI every bedrock-core
 * addon mounts with one line:
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { ui } from '@bedrock-core/config';
 *
 * core.register({ ..., translations: translationKeys, guide: guides });
 * ui(core);                         // registers the commands and joins the host election
 * ```
 *
 * This file is the package's public surface and nothing else. The map:
 *
 * - `mount.tsx` — `ui()`, command dispatch, and the host-side open funnel where the
 *   permission clamp lives. Start there; it explains why the command owner does so little.
 * - `commands/` — the shared `core:*` commands, and the per-addon ones generated from the
 *   config schema, with their argument parsing and scope targeting.
 * - `navigation/` — turning a fired command into a route stack (`openTarget` → `initialState`).
 * - `config/` — the config domain: schema shaping, value transport over RPC, flat/nested paths.
 * - `permissions.ts` — who may reach which scope, the caller-side half of authorization.
 * - `screens/` — the screens themselves, reading everything through `context.ts`.
 */
export { ui } from './mount';
export type { UiOptions } from './mount';

export { App } from './App';
export type { AppProps } from './App';

export { registerAddonCommands } from './commands/addon';
export type { OpenCallback } from './commands/addon';
export { allowedScopes, clampTarget, isOperator } from './permissions';

export type { OpenCommand, OpenTarget } from './navigation/openTarget';
export type { AppRoutes, AppScreen } from './navigation/routes';
export { CONFIG_SCOPES } from './types';
export type { ConfigScope, EntrySchema, FlatSchemaLike } from './types';
