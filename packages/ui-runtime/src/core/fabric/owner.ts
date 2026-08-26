import type { Entity, Player } from '@minecraft/server';
import { ContainerScreenError } from '../types';

/**
 * Who a render belongs to, and therefore what its hooks may reach.
 *
 * A fiber tree is keyed by its owner: a server form belongs to the player it is
 * shown to, a container screen belongs to the entity every viewer shares, and a
 * build belongs to nobody — it renders once to decide a shape. The kind is what
 * a dispatcher consults before handing out a player, and the id is what fibers
 * and sessions are keyed by. Entity and player ids come from the same space, so
 * the two never collide.
 */
export type Owner
  = | { readonly kind: 'player'; readonly id: string; readonly player: Player }
    | { readonly kind: 'entity'; readonly id: string; readonly entity: Entity }
    | { readonly kind: 'build'; readonly id: 'build' };

export const playerOwner = (player: Player): Owner => ({ kind: 'player', id: player.id, player });

export const entityOwner = (entity: Entity): Owner => ({ kind: 'entity', id: entity.id, entity });

/**
 * The build machine. A single id, because a build renders one screen at a time
 * and clears its fibers before and after.
 */
export const BUILD_OWNER: Owner = { kind: 'build', id: 'build' };

/**
 * The player a hook may read, or the reason there is none.
 *
 * One compiled layout serves every player who opens a container, so a hook
 * asking for "the" player has nothing to return; the acting player reaches a
 * container screen through its handlers instead.
 */
export function requirePlayer(owner: Owner, hook: string): Player {
  if (owner.kind === 'player') {
    return owner.player;
  }

  throw new ContainerScreenError(
    `${hook}() cannot be used in a container screen.\n`
    + '  One compiled layout serves every player who opens it, so there is no player to read.\n'
    + '  Instead: handlers receive the acting player — onPress(player, host), onInsert(player, stack, host), onRemove(player, stack, host).',
  );
}
