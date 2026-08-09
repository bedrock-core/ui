import { system, CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, Player } from '@minecraft/server';

/** The three commands this UI owns. Sent to the host verbatim so it decides what each means. */
export type OpenCommand = 'core:list' | 'core:guide' | 'core:config';

/**
 * Receives a fired command completely uninterpreted: who ran it, which command, and the raw
 * optional parameters in declaration order. Interpreting `args` is deliberately NOT done here
 * — see `index.tsx` for why the realm that owns the commands stays this dumb.
 */
type OpenCallback = (player: Player, command: OpenCommand, args: (string | undefined)[]) => void;

/**
 * Register the `core:list`, `core:guide`, and `core:config` commands — first realm wins.
 *
 * Every bedrock-core addon mounts this UI, but Bedrock's custom-command registry is
 * world-global and duplicate identifiers throw. The first pack to load registers the
 * commands; later realms catch the duplicate error on the FIRST registration and stand down
 * without attempting the other two, so ownership is all-or-nothing (no split ownership).
 * There is no unregister API and registration only happens during the startup event, so
 * whoever wins keeps the command names for the life of the world.
 *
 * Winning the commands does NOT mean serving the UI. `onOpen` hands the raw command and args
 * to `index.tsx`, which forwards them to whichever realm currently wins the host election.
 * Load order decides who *receives* a command; runtime version decides who *answers* it.
 *
 * This file is the one part that genuinely cannot be fixed by installing a newer addon: the
 * command NAMES and their PARAMETER LISTS are frozen at whatever the winning realm declared.
 * Adding a parameter in a later version therefore needs care — the host must keep working
 * when an older realm forwards a shorter `args` array.
 */
export function registerRuntimeCommands(onOpen: OpenCallback): void {
  system.beforeEvents.startup.subscribe((ev) => {
    const reg = ev.customCommandRegistry;

    // Attempt the first command atomically: if it throws, another realm already owns
    // the UI, so stand down entirely rather than register list/guide on their own.
    try {
      reg.registerCommand(
        {
          name: 'core:config',
          description: 'Open the config UI. Usage: core:config [addonId] [scope] [scopeId]',
          permissionLevel: CommandPermissionLevel.Any,
          optionalParameters: [
            { name: 'addonId', type: CustomCommandParamType.String },
            { name: 'scope', type: CustomCommandParamType.String },
            { name: 'scopeId', type: CustomCommandParamType.String },
          ],
        },
        (origin, addonId?: string, scope?: string, scopeId?: string) => {
          if (!(origin.sourceEntity instanceof Player)) {
            return { status: CustomCommandStatus.Failure, message: 'Must be run by a player' };
          }

          const player = origin.sourceEntity;

          system.run(() => onOpen(player, 'core:config', [addonId, scope, scopeId]));

          return { status: CustomCommandStatus.Success };
        },
      );
    } catch {
      console.info('[config] core:config is already registered by another addon - this realm will not own the commands');

      return;
    }

    // First registration succeeded, so this realm owns the commands: register the rest.
    reg.registerCommand(
      {
        name: 'core:list',
        description: 'Open the addon list. Usage: core:list [addonId]',
        permissionLevel: CommandPermissionLevel.Any,
        optionalParameters: [
          { name: 'addonId', type: CustomCommandParamType.String },
        ],
      },
      (origin, addonId?: string) => {
        if (!(origin.sourceEntity instanceof Player)) {
          return { status: CustomCommandStatus.Failure, message: 'Must be run by a player' };
        }

        const player = origin.sourceEntity;

        system.run(() => onOpen(player, 'core:list', [addonId]));

        return { status: CustomCommandStatus.Success };
      },
    );

    reg.registerCommand(
      {
        name: 'core:guide',
        description: 'Open the addon guide. Usage: core:guide [addonId]',
        permissionLevel: CommandPermissionLevel.Any,
        optionalParameters: [
          { name: 'addonId', type: CustomCommandParamType.String },
        ],
      },
      (origin, addonId?: string) => {
        if (!(origin.sourceEntity instanceof Player)) {
          return { status: CustomCommandStatus.Failure, message: 'Must be run by a player' };
        }

        const player = origin.sourceEntity;

        system.run(() => onOpen(player, 'core:guide', [addonId]));

        return { status: CustomCommandStatus.Success };
      },
    );
  });
}
