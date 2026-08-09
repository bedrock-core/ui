/** @jsxImportSource @bedrock-core/ui-runtime */
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
 * ## Why the command owner does almost nothing
 *
 * Two "who serves this?" questions get different answers on purpose:
 *
 * 1. **Who owns the commands** — Bedrock's custom-command registry is world-global,
 *    `registerCommand` throws on a duplicate, and there is no unregister. The first realm to
 *    load owns `core:list`/`core:guide`/`core:config` for the life of the world. Immovable.
 * 2. **Who answers them** — the realm running the newest `@bedrock-core/server-runtime`, per
 *    `core.host`. This moves the moment a newer addon loads.
 *
 * A world can easily hold an addon built a year ago and one built today. The old addon's copy
 * of this package is frozen — its bugs cannot be patched, ever, because its author may never
 * ship again. So the owner realm is deliberately kept to the smallest possible slice of
 * behaviour: identify the player, name the command, forward the raw arguments. Every real
 * decision — what the arguments mean, which screen opens, how anything renders — happens on
 * the host, which is by construction the newest code installed. Installing one up-to-date
 * addon therefore fixes the shared UI for every addon in the world.
 *
 * Everything below the forward is host-side. Keep it that way when extending this: logic
 * added to the router is logic that can never be fixed in the field.
 */
import { world } from '@minecraft/server';
import type { Player } from '@minecraft/server';
import { render } from '@bedrock-core/ui-runtime';
import type { Runtime } from '@bedrock-core/server-runtime';
import { registerRuntimeCommands, type OpenCommand } from './commands';
import { openTargetFrom, type OpenTarget } from './openTarget';
import { App } from './App';

/** What the owner realm forwards: who typed it, what they typed, and the untouched arguments. */
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

/**
 * Mount the shared config UI on a runtime. Call once, after `core.register()`.
 *
 * Registers the three commands (first realm to load wins them) and serves the open RPC, so
 * this realm can render on behalf of another whenever it wins the host election.
 */
export function ui(core: Runtime): void {
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

  registerRuntimeCommands((player, command, args) => {
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
  });
}

function open(core: Runtime, player: Player, target: OpenTarget): void {
  render(<App core={core} player={player} target={target} />, player);
}

export { App } from './App';
export type { AppProps } from './App';
export type { OpenCommand } from './commands';
export type { OpenTarget } from './openTarget';
export type { AppRoutes, AppScreen, ConfigScope, EntrySchema } from './routes';
