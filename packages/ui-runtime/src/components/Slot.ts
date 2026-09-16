import type { SlotEvent } from '../core/events';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/** The host `type` emitted by {@link Slot}. Only meaningful inside a `<Container>`. */
export const SLOT_TYPE = 'container-slot';

/** The engine's item cell, in texels. Every slot it draws is this size. */
export const SLOT_CELL = 18;

/**
 * What an interactive slot lets the player do, enforced by the runtime rather
 * than the engine: a container gives no way to veto a move, so a forbidden one
 * is undone a tick later. A locked slot (`interactive={false}`) has no role —
 * nothing moves through it at all.
 *
 *  - `both`   — ordinary storage. Anything in, anything out.
 *  - `input`  — items go in and do not come back out. A furnace's fuel slot.
 *  - `output` — items may be taken and nothing put in. A furnace's result.
 */
export type SlotRole = 'both' | 'input' | 'output';

/**
 * A foreign slot's source: some other collection, at an author-given index.
 *
 * Present only when the author named a `collection`. The screen never owns the
 * cell, so the runtime does not allocate or poll it — the engine's own
 * take/place drives it, or nothing does when it is display-only.
 */
export interface SlotSource {
  /** JSON UI collection the cell reads, e.g. `inventory_items`. */
  collection: string;
  /** Which cell of that collection to draw. */
  index: number;
  /** Whether the player can move items through it. False draws an inert cell. */
  interactive: boolean;
}

export interface SlotProps extends ControlProps {
  /**
   * What addon logic calls this cell: `container.getItem('output')` reaches it
   * by this name instead of by a counted index. Own slots only — a foreign
   * slot draws someone else's collection, so the screen has no cell of its own
   * to name — and unique within a screen. Both are build-time errors.
   *
   * Most cells want no name: an unnamed cell is found by walking the
   * container's indices, which is what a grid of interchangeable inputs wants.
   */
  name?: string;
  /** Defaults to `both`: ordinary storage. Enforced at runtime, and ignored on a foreign or locked slot. */
  role?: SlotRole;
  /** Ran after an item arrives: `event.stack` is what was put in, `event.player` who put it there. */
  onInsert?: (event: SlotEvent) => void;
  /** Ran after the slot empties: `event.stack` is what left, `event.player` who took it. */
  onRemove?: (event: SlotEvent) => void;
  /**
   * A collection to read instead of the screen's own. Given one, the slot is
   * foreign: it draws `collection[index]` and the runtime never touches it —
   * the engine's take/place drives it, gated only by {@link interactive}.
   */
  collection?: string;
  /** The cell within {@link collection}. Required, and only legal, with `collection`. */
  index?: number;
  /**
   * Whether the player can move items through the slot. Default `true`. False
   * draws an inert cell: the item shows but no take, place or drop reaches it.
   * A container can only undo a move a tick later, never veto one, so a slot
   * the player must not touch at all is locked here rather than policed at
   * runtime. A locked slot has no {@link role}.
   */
  interactive?: boolean;
}

/**
 * A container cell. Interactive by default: the player moves items through it
 * and the screen sees what arrives, with {@link role} governing which moves the
 * runtime undoes. Locked with `interactive={false}`: the item shows but the
 * cell takes no take, place or drop. A fixed-size flex child, because the
 * engine's cell is fixed.
 *
 * Given a `collection`, the slot instead draws a cell of THAT collection at the
 * `index` the author names — the player's inventory, another entity's, any
 * JSON UI collection — and the screen neither allocates nor polls it. A role is
 * a runtime-poll concept for the screen's own slots, so it has no meaning on a
 * foreign slot and is refused; `interactive={false}` makes the cell inert.
 *
 * Handlers are props, like anywhere else in this library. They are matched to
 * the cell by its position in the tree, which is stable because a compiled
 * screen cannot change shape — so nothing is named and nothing is registered.
 *
 * A `name` is the other direction: what the screen's own logic calls the cell,
 * so `container.getItem('output')` reaches it without counting container
 * indices.
 */
export const Slot: FunctionComponent<SlotProps> = ({
  name,
  role,
  onInsert,
  onRemove,
  collection,
  index,
  interactive,
  ...rest
}: SlotProps): JSX.Element => {
  const foreign = collection !== undefined;

  if (foreign) {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
      throw new RangeError(
        '<Slot collection> needs an integer index >= 0: the cell of that collection to draw. '
        + `Got ${String(index)}.`,
      );
    }

    if (role !== undefined) {
      throw new RangeError(
        '<Slot> `role` cannot be combined with `collection`. A role is enforced by the '
        + 'runtime\'s poll, which never runs on a foreign slot; use `interactive` to make the '
        + 'cell inert instead.',
      );
    }
  } else if (index !== undefined) {
    throw new RangeError('<Slot> `index` needs a `collection`: the collection the index is into.');
  }

  return {
    type: SLOT_TYPE,
    props: {
      ...withControl({ width: SLOT_CELL, height: SLOT_CELL, ...rest }),
      name,
      role: role ?? 'both',
      onInsert,
      onRemove,
      interactive: interactive !== false,
      ...foreign ? { collection, index } : {},
    },
  };
};

/** The role a built OWN `<Slot>` declares. Foreign slots have no role. */
export function slotRole(element: JSX.Element): SlotRole {
  const { role } = element.props;

  return role === 'input' || role === 'output' ? role : 'both';
}

/**
 * The name a built `<Slot>` carries, or undefined when the author gave none.
 * Only a name something could be looked up by counts, so a blank one reads as
 * absent.
 */
export function slotName(element: JSX.Element): string | undefined {
  const { name } = element.props;

  return typeof name === 'string' && name !== '' ? name : undefined;
}

/** Whether a built `<Slot>` lets the player move items through it. */
export function slotInteractive(element: JSX.Element): boolean {
  return element.props.interactive !== false;
}

/** The foreign source a built `<Slot>` reads, or undefined when it is the screen's own. */
export function slotSource(element: JSX.Element): SlotSource | undefined {
  const { collection, index, interactive } = element.props;

  if (typeof collection !== 'string' || collection === '') {
    return undefined;
  }

  return {
    collection,
    index: typeof index === 'number' ? index : 0,
    interactive: interactive !== false,
  };
}

/** Whether a built `<Slot>` reads a collection other than the screen's own. */
export function isForeignSlot(element: JSX.Element): boolean {
  return slotSource(element) !== undefined;
}

/**
 * The cell a built `<Slot>` claims in the screen's container: its role, unless
 * it is foreign — a foreign slot reads another collection at the author's
 * index, so it takes no cell of the screen's own and is never polled.
 */
export function slotCell(element: JSX.Element): SlotRole | undefined {
  return element.type === SLOT_TYPE && !isForeignSlot(element) ? slotRole(element) : undefined;
}
