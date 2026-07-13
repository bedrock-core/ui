import { system, CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, Player } from '@minecraft/server';
import type { ConfigScope } from './routes';

/** Where a command wants the UI to open. */
export type OpenTarget
  = | { kind: 'list'; addonId?: string }
    | { kind: 'guide'; addonId?: string }
    | { kind: 'config'; addonId?: string; scope?: ConfigScope; scopeId?: string };

type OpenCallback = (player: Player, target: OpenTarget) => void;

function resolveScope(scope: string | undefined): ConfigScope | undefined {
  if (scope === 'server' || scope === 'dimension' || scope === 'player') {
    return scope;
  }

  return undefined;
}

/**
 * Register the `core:list`, `core:guide`, and `core:config` commands — first realm wins.
 *
 * Every bedrock-core addon mounts this UI, but Bedrock's custom-command registry is
 * world-global and duplicate identifiers throw. The first pack to load registers the
 * commands and its realm serves the UI for EVERY addon (the UI reads registry, config,
 * translations, and guides over sync state, so any single realm can render it all).
 * Later realms catch the duplicate error on the FIRST registration and stand down
 * without attempting the other two, so hosting is all-or-nothing (no split ownership).
 * Which addon's copy serves is load-order dependent, so addons built against different
 * config versions may serve an older UI — acceptable, since the data contract flows
 * over sync.
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

          system.run(() => onOpen(player, { kind: 'config', addonId, scope: resolveScope(scope), scopeId }));

          return { status: CustomCommandStatus.Success };
        },
      );
    } catch {
      console.info('[config] core:config is already registered by another addon - this realm will not serve the config UI');

      return;
    }

    // First registration succeeded, so this realm owns the UI: register the rest.
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

        system.run(() => onOpen(player, { kind: 'list', addonId }));

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

        system.run(() => onOpen(player, { kind: 'guide', addonId }));

        return { status: CustomCommandStatus.Success };
      },
    );
  });
}
