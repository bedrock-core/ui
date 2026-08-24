import type { ItemStack, Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { SLOT_SIZE } from './constants';

/**
 * What a slot lets the player do.
 *
 * Enforced by the RUNTIME, never by the engine: a container gives no way to veto
 * a move, so a forbidden one is undone a tick later rather than prevented.
 *
 *  - `both`   — ordinary storage. Anything in, anything out.
 *  - `input`  — items may go in and not come back out. A furnace's fuel slot.
 *  - `output` — items may be taken and nothing put in. A furnace's result.
 *  - `button` — the runtime owns the item, so taking it reads as a press.
 */
export type SlotRole = 'both' | 'input' | 'output' | 'button';

export interface SlotProps extends ControlProps {
  /** Defaults to `both`: ordinary storage. */
  role?: SlotRole;
  /** Ran after an item arrives. */
  onInsert?: (player: Player, stack: ItemStack) => void;
  /** Ran after the slot empties. */
  onRemove?: (player: Player) => void;
}

/**
 * A real container slot: the player can move items through it, and the screen
 * sees what arrives.
 *
 * Handlers are props, like anywhere else in this library — there is no separate
 * registry to keep in step with the layout. They are matched to slots by
 * POSITION: the tree cannot change shape, so the third slot of one render is
 * the third slot of the next, which makes a name unnecessary.
 *
 * Size is fixed at 18 texels because the engine's own cell is, so a slot behaves
 * as a fixed-size flex child.
 */
export const Slot: FunctionComponent<SlotProps> = ({
  role = 'both',
  onInsert,
  onRemove,
  ...rest
}: SlotProps): JSX.Element => ({
  type: 'container_slot',
  props: {
    ...withControl({ width: SLOT_SIZE, height: SLOT_SIZE, ...rest }),
    role,
    onInsert,
    onRemove,
  },
});
