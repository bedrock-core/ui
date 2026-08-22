import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { SLOT_SIZE } from './constants';

export interface SlotProps extends ControlProps {
  /**
   * Addresses this slot from the script side. The generated handle keys its
   * `onClick` and `onInsert` maps on it, so it has to be unique within a screen
   * and stable across builds — renaming one is a breaking change for the addon
   * that uses it.
   */
  name: string;
}

/**
 * A real container slot: the player can move items through it, and the script
 * sees what arrives.
 *
 * Size is fixed at 18 texels because the engine's own cell is, so a slot behaves
 * as a fixed-size flex child. What the slot *does* — display, button, input,
 * output — is decided on the script side, not here, because it is the runtime
 * that polls and restores. A screen only says where the slots are.
 *
 * The compiler allocates the underlying `collection_index`; nothing about the
 * container's layout is written by hand.
 */
export const Slot: FunctionComponent<SlotProps> = ({ name, ...rest }: SlotProps): JSX.Element => ({
  type: 'container_slot',
  props: {
    ...withControl({ width: SLOT_SIZE, height: SLOT_SIZE, ...rest }),
    name,
  },
});
