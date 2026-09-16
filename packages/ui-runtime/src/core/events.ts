import type { Block, Entity, ItemStack, Player } from '@minecraft/server';
import type { NamedContainer } from '../entity/container';

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

/**
 * What a container screen belongs to: the custom entity or the custom block a
 * player opened it from. Both carry the screen's container, its state and its
 * place in the world, so a handler reads either the same way.
 */
export type ScreenHost = Entity | Block;
export interface UiEvent {
  /** The player the event is about. Never invalid: the runtime checks before calling. */
  readonly player: Player;
  /** The entity or block that owns the screen, on a host whose screens belong to one. */
  readonly host?: ScreenHost;
  /**
   * The screen's own cells, on a host that has any — the vanilla `Container`
   * over them, where index `i` is the `i`-th own `<Slot>` in document order
   * and a name reaches the one the author named. Present exactly when
   * {@link host} is.
   *
   * It is how a handler written INSIDE the component reaches the screen's
   * cells: the component cannot import the screen object without a cycle, so
   * the cells come to it on the event instead. Names are plain strings here —
   * typing them would mean a generic on every handler prop in the library, and
   * the screen object offers the typed container for code that wants one.
   */
  readonly container?: NamedContainer<string>;
}

/**
 * A button press. `host` and `container` are present exactly when the screen
 * belongs to an entity.
 */
export type PressEvent = UiEvent;

/**
 * Something that happened on a screen an entity or a block owns, so the host is
 * always there — the screen's own state, its container and its world position
 * all hang off it.
 */
export interface ContainerEvent extends UiEvent {
  readonly host: ScreenHost;
  readonly container: NamedContainer<string>;
}

/** An item arrived in a slot, or left one. */
export interface SlotEvent extends ContainerEvent {
  /** The stack that moved: what was put in, or what was taken out. */
  readonly stack: ItemStack;
}

/**
 * A handler prop, when the author gave one.
 *
 * A predicate rather than a cast: props arrive as `unknown`, and every call
 * site would otherwise assert its way to a signature the compiler cannot
 * check. The caller names the handler shape it expects, and what it gets back
 * is narrowed rather than asserted.
 */
export const isHandler = <T extends (...args: never[]) => unknown>(value: unknown): value is T =>
  typeof value === 'function';
