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
import { App } from './App';

/** What a receiving realm forwards: who typed it, what they asked for, and untouched arguments. */
interface OpenRequest {
  playerId: string;
  command: OpenCommand;
  args: (string | undefined)[];
}

/**
 * The RPC surface every realm that mounts this UI serves, since any of them may win the
 * election later. Namespaced like the runtime's own methods (`bc:config.*`).
 */
interface HostUiRpc {
  'bc:ui.open': (params: OpenRequest) => boolean;
}

/** Options for {@link ui}. */
export interface UiOptions {
  /**
   * Register this addon's `<namespace>:config` / `:configat` / `:guide` / `:list` commands
   * (see `commands/addon.ts`). On by default.
   *
   * Passing `false` leaves this addon with **no** commands at all — there is no shared surface
   * to fall back on — so the UI becomes reachable only through another installed addon's
   * commands or a call to `openConfigUi` of your own. That is a legitimate choice for an addon
   * with no config that would rather not add names to the command list.
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
    'bc:ui.open': ({ playerId, command, args }) => {
      const player = world.getPlayers().find(candidate => candidate.id === playerId);

      // Disconnected between typing the command and this request. Nothing the caller can do
      // about it, so reject rather than drop it silently.
      if (!player) { throw new Error(`bc:ui.open: player '${playerId}' is not in the world`); }

      open(core, player, openTargetFrom(command, args));

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
    open(core, player, openTargetFrom(command, args));

    return;
  }

  core.rpc.typed<HostUiRpc>(core.host.hostId)['bc:ui.open']({ playerId: player.id, command, args })
    .catch((error: unknown) => {
      // The host went down between the election and the request, or is wedged. Our own copy
      // may be older and buggier, but showing it beats the command doing nothing.
      console.warn(`[config] host '${core.host.hostId}' did not answer ${command} (${String(error)}) - opening locally`);

      open(core, player, openTargetFrom(command, args));
    });
}

/**
 * The single funnel every way of opening this UI passes through — the command callback above,
 * the `bc:ui.open` RPC, and the local fallback — which is why the permission clamp lives here
 * rather than in a screen. It also runs host-side, so the rule stays patchable in the field
 * even for a world whose command owner shipped a year ago.
 */
function open(core: Runtime, player: Player, target: OpenTarget): void {
  const clamped = clampTarget(target, player);

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
