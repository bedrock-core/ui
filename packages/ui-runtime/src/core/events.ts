import type { Entity, ItemStack, Player } from '@minecraft/server';

/**
 * What a handler is called with.
 *
 * Every handler in the library takes exactly one object. A handler is a prop
 * like any other and knows nothing about the screen it ends up on, so what
 * reaches it cannot be a positional argument list that changes per backend:
 * a form knows its viewer and has no entity, a container screen knows the
 * entity and the player who acted, and a future host may know something else
 * again. One object grows by gaining a field, which breaks nothing.
 *
 * `player` is always the player the event is ABOUT: the viewer on a form, and
 * on a container screen the player who moved the item — traced by the poll,
 * since a container reports no actor of its own.
 */
export interface UiEvent {
  /** The player the event is about. Never invalid: the runtime checks before calling. */
  readonly player: Player;
  /** The entity that owns the screen, on a host whose screens belong to one. */
  readonly host?: Entity;
}

/** A button press. `host` is present exactly when the screen belongs to an entity. */
export type PressEvent = UiEvent;

/**
 * Something that happened on a screen an entity owns, so the entity is always
 * there — the screen's own state, its container and its world position all
 * hang off it.
 */
export interface ContainerEvent extends UiEvent {
  readonly host: Entity;
}

/** An item arrived in a slot, or left one. */
export interface SlotEvent extends ContainerEvent {
  /** The stack that moved: what was put in, or what was taken out. */
  readonly stack: ItemStack;
}
