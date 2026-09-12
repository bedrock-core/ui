/**
 * `@bedrock-core/config` — the addon list + config + guide UI every bedrock-core
 * addon mounts with one line:
 *
 * ```ts
 * import { core } from '@bedrock-core/server-runtime';
 * import { ui } from '@bedrock-core/config';
 *
 * core.register({ manifest, config });
 * ui(core);                         // registers the commands and joins the host election
 * ```
 *
 * The addon declares; the build does the rest. The ui-compiler filter reads that
 * register call and compiles what follows from it — the addon's page in the
 * shared list, drawn from its manifest, and one config screen per section of its
 * schema — and `ui()` announces those along with the i18n bundle and guide the
 * other filters generated. Nothing above is repeated anywhere else.
 *
 * This file is the package's public surface and nothing else. The map:
 *
 * - `mount.tsx` — `ui()`, command dispatch, and the host-side open funnel where the
 *   permission clamp lives. Start there; it explains why the command owner does so little.
 * - `commands/` — the per-addon commands generated from the config schema, with their
 *   argument parsing and scope targeting.
 * - `navigation/` — turning a fired command into a route stack (`openTarget` → `initialState`).
 * - `config/` — the config domain: schema shaping, value transport over RPC, flat/nested paths.
 * - `permissions.ts` — who may reach which scope, the caller-side half of authorization.
 * - `screens/` — the screens themselves, reading everything through `context.ts`.
 */
export { ui, openUi } from './mount';
export type { UiOptions } from './mount';

export { registerAddonCommands } from './commands/addon';
export type { OpenCallback } from './commands/addon';
export { allowedScopes, clampTarget, guideAudienceFor, isOperator } from './permissions';

export type { OpenCommand, OpenTarget } from './navigation/openTarget';
export { CONFIG_SCOPES } from './types';
export type { ConfigScope, EntrySchema, FlatSchemaLike } from './types';

/**
 * The config screens an addon's own schema becomes, for the ui-compiler filter's
 * `screens` setting: one per section that holds settings, shaped for it.
 */
export { configScreens, leafName, registerConfigScreens, type LeafModel, type LeafProps } from './compiled/shaped';

/**
 * What a build declares on its addon's behalf: the page drawn from its manifest,
 * its i18n bundle, its guide manifest. The ui-compiler filter generates the
 * module that calls these; `ui()` publishes what they carry.
 */
export { addonPageScreen, type AddonPageInfo } from './compiled/page.screen';
export { registerDeclared, type DeclaredParts } from './declared';
