/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * Getting a fired command onto a screen.
 *
 * ## Why the realm that receives a command rarely renders it
 *
 * Each addon owns its own commands, in its own namespace (see `commands/addon.ts`), so nothing
 * is contended and nothing is frozen. But a world can easily hold an addon built a year ago and
 * one built today, and the old one's bundled copy of THIS package cannot be patched — its
 * author may never ship again.
 *
 * So receiving a command and answering it are split. The realm whose command was typed does the
 * smallest possible slice: identify the player, name the request, forward the raw arguments.
 * Every real decision — what the arguments mean, which screen opens, how anything renders —
 * happens on the elected host, which by construction runs the newest `@bedrock-core/server-runtime`
 * installed. Installing one up-to-date addon therefore fixes the shared UI for every addon in
 * the world, including the ones typed into an ancient realm.
 *
 * Everything below {@link dispatch} is host-side. Keep it that way when extending this: logic
 * added before the forward is logic that can never be fixed in the field.
 */
import { world } from '@minecraft/server';
import type { Player } from '@minecraft/server';
import { render } from '@bedrock-core/ui-runtime';
import type { Runtime } from '@bedrock-core/server-runtime';
import { registerAddonCommands } from './commands/addon';
import { openTargetFrom, type OpenCommand, type OpenTarget } from './navigation/openTarget';
import { clampTarget } from './permissions';
import { getScopeValues } from './config/values';
import {
  buildSectionTree,
  filterScope,
  filterScopeGroups,
  getScopedGroups,
  getScopedSchema,
  isPureSection,
} from './config/schema';
import { App } from './App';

/** What a receiving realm forwards: who typed it, what they asked for, and untouched arguments. */
interface OpenRequest {
  playerId: string;
  command: OpenCommand;
  args: (string | undefined)[];
}

/**
 * The RPC surface every realm that mounts this UI serves, since any of them may win the
 * election later. Namespaced like the runtime's own methods (`core:config.*`).
 */
interface HostUiRpc {
  'core:ui.open': (params: OpenRequest) => boolean;
}

/** Options for {@link ui}. */
export interface UiOptions {
  /**
   * Register this addon's `<namespace>:config` / `:configat` / `:guide` / `:list` commands
   * (see `commands/addon.ts`). On by default.
   *
   * Passing `false` leaves this addon with **no** commands at all, so the UI becomes reachable
   * only through another installed addon's commands or your own call to {@link openUi}.
   * That is a legitimate choice for an addon with no config that would rather not add names
   * to the command list.
   *
   * It frees those four names, not the namespace: whatever commands the addon does register
   * still belong under `core.id` (see `commands/addon.ts`).
   */
  commands?: boolean;
}

/**
 * Mount the shared config UI on a runtime. Call once, after `core.register()`.
 *
 * Registers this addon's commands and serves the open RPC, so this realm can render on behalf
 * of another whenever it wins the host election.
 */
export function ui(core: Runtime, options: UiOptions = {}): void {
  core.rpc.serve<HostUiRpc>({
    'core:ui.open': ({ playerId, command, args }) => {
      const player = world.getPlayers().find(candidate => candidate.id === playerId);

      // Disconnected between typing the command and this request. Nothing the caller can do
      // about it, so reject rather than drop it silently.
      if (!player) { throw new Error(`core:ui.open: player '${playerId}' is not in the world`); }

      openUi(core, player, openTargetFrom(command, args));

      return true;
    },
  });

  if (options.commands !== false) {
    registerAddonCommands(core, (player, command, args) => { dispatch(core, player, command, args); });
  }
}

/**
 * Send a fired command to whoever should answer it: this realm when it is the host, otherwise
 * the elected host over RPC.
 */
function dispatch(core: Runtime, player: Player, command: OpenCommand, args: (string | undefined)[]): void {
  if (core.host.isHost) {
    openUi(core, player, openTargetFrom(command, args));

    return;
  }

  core.rpc.typed<HostUiRpc>(core.host.hostId)['core:ui.open']({ playerId: player.id, command, args })
    .catch((error: unknown) => {
      // The host went down between the election and the request, or is wedged. Our own copy
      // may be older and buggier, but showing it beats the command doing nothing.
      console.warn(`[config] host '${core.host.hostId}' did not answer ${command} (${String(error)}) - opening locally`);

      openUi(core, player, openTargetFrom(command, args));
    });
}

/**
 * Open the shared UI for a player, from your own code — an item use, a block interaction, an
 * event handler, anything. This is the same funnel the commands go through, which is why the
 * permission clamp lives here rather than in a screen.
 *
 * ```ts
 * world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
 *   if (itemStack.typeId !== 'drav0011_shop:guide_book') { return; }
 *
 *   openUi(core, source, { kind: 'guide', addonId: core.id });
 * });
 * ```
 *
 * The target picks the screen: `{ kind: 'list' }` for the addon browser, `{ kind: 'guide' }` for
 * an addon's guide, `{ kind: 'config' }` for its settings — each optionally naming an `addonId`,
 * and config additionally a `scope` and `scopeId` to open straight into one scope.
 *
 * `clampTarget` still applies, so a non-operator cannot reach past their own player scope even
 * if you pass a target that says otherwise. Values for a deep-linked config scope are fetched
 * before the first render.
 *
 * Renders in THIS realm. A typed command forwards to the elected host so the world's newest UI
 * answers it; a direct call is your own code and renders your own copy.
 */
export function openUi(core: Runtime, player: Player, target: OpenTarget): void {
  const clamped = clampTarget(target, player, core);

  const scopeIsSections = scopeHoldsOnlySections(core, player, clamped);

  // A scope that holds only sub-sections lands on the section screen, which needs no values —
  // fetching for it would be a round trip whose result nothing reads.
  if (scopeIsSections) {
    render(<App core={core} player={player} target={clamped} scopeIsSections={true} />, player);

    return;
  }

  void prefetchScopeValues(core, player, clamped).then((values) => {
    render(<App core={core} player={player} target={clamped} values={values} />, player);
  });
}

/**
 * Fetch the values a deep link needs BEFORE the first render.
 *
 * `Config` presents a native modal built from the values it is given, so it cannot fetch its
 * own: arriving empty and re-rendering would present the form twice. Every in-UI path already
 * fetches on the press that navigates — this is the same rule for the path that has no press,
 * and without it a command that names a scope opens showing schema defaults instead of what is
 * actually set. Resolves `undefined` whenever the target does not deep-link that far, and on
 * failure, which leaves the deep link to fall back to the scope pickers.
 */
async function prefetchScopeValues(
  core: Runtime,
  player: Player,
  target: OpenTarget,
): Promise<Record<string, unknown> | undefined> {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined) { return undefined; }

  // Only the server scope identifies itself; the other two need to know which entity.
  if (target.scope !== 'server' && target.scopeId === undefined) { return undefined; }

  const accessor = core.config.of(target.addonId, { actorId: player.id });

  if (!accessor) { return undefined; }

  try {
    return await getScopeValues(accessor, target.scope, target.scopeId);
  } catch (error: unknown) {
    console.warn(`[config] prefetching '${target.addonId}' ${target.scope} values failed: ${String(error)}`);

    return undefined;
  }
}

/**
 * Whether the scope a deep link names holds only sub-sections, and so opens as a screen of
 * buttons rather than as a form.
 *
 * Synchronous: the schema is replicated state, already local, unlike the values which are an
 * RPC away. That is the whole reason this can be decided before the fetch is even started.
 */
function scopeHoldsOnlySections(core: Runtime, player: Player, target: OpenTarget): boolean {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined) { return false; }

  if (target.scope !== 'server' && target.scopeId === undefined) { return false; }

  const accessor = core.config.of(target.addonId, { actorId: player.id });

  if (!accessor) { return false; }

  return isPureSection(buildSectionTree(
    filterScope(getScopedSchema(accessor), target.scope),
    filterScopeGroups(getScopedGroups(accessor), target.scope),
  ));
}
