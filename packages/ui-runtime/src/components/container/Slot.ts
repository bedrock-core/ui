import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { SLOT_SIZE } from './constants';

/**
 * What a slot lets the player do.
 *
 * Enforced by the RUNTIME, never by the engine: a container gives no way to veto
 * a move, so a forbidden one is undone a tick later rather than prevented. The
 * player may see their item flicker; there is no mechanism that avoids that.
 *
 *  - `both`   — ordinary storage. Anything in, anything out.
 *  - `input`  — items may go in and not come back out. A furnace's fuel slot.
 *  - `output` — items may be taken and nothing put in. A furnace's result.
 *  - `button` — the runtime owns the item and puts it straight back, so taking
 *    it reads as a press.
 */
export type SlotRole = 'both' | 'input' | 'output' | 'button';

export interface SlotProps extends ControlProps {
  /**
   * Addresses this slot from the script side. The generated handle keys its
   * `onClick` and `onInsert` maps on it, so it has to be unique within a screen
   * and stable across builds — renaming one is a breaking change for the addon
   * that uses it.
   */
  name: string;
  /** Defaults to `both`: ordinary storage. */
  role?: SlotRole;
}

/**
 * A real container slot: the player can move items through it, and the script
 * sees what arrives.
 *
 * Size is fixed at 18 texels because the engine's own cell is, so a slot behaves
 * as a fixed-size flex child. The ROLE travels with the layout rather than with
 * the script, because it is a property of the screen — a furnace's output slot
 * is an output slot whatever the script does with it — and because the handle
 * can then type-check that the behaviours attached to it make sense.
 *
 * The compiler allocates the underlying `collection_index`; nothing about the
 * container's layout is written by hand.
 */
export const Slot: FunctionComponent<SlotProps> = ({
  name,
  role = 'both',
  ...rest
}: SlotProps): JSX.Element => ({
  type: 'container_slot',
  props: {
    ...withControl({ width: SLOT_SIZE, height: SLOT_SIZE, ...rest }),
    name,
    role,
  },
});
