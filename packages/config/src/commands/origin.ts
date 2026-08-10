/**
 * Who ran a command, and what to answer them.
 *
 * Every command in this package starts the same way — establish the acting player, or refuse —
 * and ends by returning a `CustomCommandResult`. Both live here so a callback body is only the
 * part that differs, and so the permission re-check cannot be forgotten on a new command.
 */
import { CustomCommandStatus, Player } from '@minecraft/server';
import type { CustomCommandOrigin, CustomCommandResult } from '@minecraft/server';
import { isOperator } from '../permissions';

export function failure(message: string): CustomCommandResult {
  return { status: CustomCommandStatus.Failure, message };
}

export function success(message?: string): CustomCommandResult {
  return message === undefined
    ? { status: CustomCommandStatus.Success }
    : { status: CustomCommandStatus.Success, message };
}

/** Run with the acting player, refusing anything a player did not run. */
export function withPlayer(
  origin: CustomCommandOrigin,
  run: (player: Player) => CustomCommandResult,
): CustomCommandResult {
  if (!(origin.sourceEntity instanceof Player)) { return failure('Must be run by a player'); }

  return run(origin.sourceEntity);
}

/**
 * Run with the acting player, re-checking operator status.
 *
 * The re-check is not redundant with the command's declared `CommandPermissionLevel`: the tier
 * the engine enforces derives from `commandPermissionLevel`, a property any script in the world
 * can rewrite, while {@link isOperator} reads the readonly `playerPermissionLevel`.
 *
 * A source that is not a player is a command block or the server console, which is allowed
 * through with no runner: placing a command block already requires the permission this guards.
 * Callers must then insist on an explicit target rather than inventing one.
 */
export function withOperator(
  origin: CustomCommandOrigin,
  run: (runner: Player | undefined) => CustomCommandResult,
): CustomCommandResult {
  const source = origin.sourceEntity;

  if (source === undefined) { return run(undefined); }

  if (!(source instanceof Player)) { return failure('Must be run by a player or a command block'); }

  if (!isOperator(source)) { return failure('Only an operator can reach another scope'); }

  return run(source);
}
