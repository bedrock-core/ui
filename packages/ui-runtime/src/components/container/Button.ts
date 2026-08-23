import type { FunctionComponent, JSX } from '../../jsx';
import { Slot, type SlotProps } from './Slot';

export type ButtonProps = Omit<SlotProps, 'role'>;

/**
 * A button.
 *
 * It is a container slot holding an item the runtime owns. Taking the item IS
 * the press — a moved item is the only signal a container gives back, so there
 * is no click event to subscribe to and nothing else to build a button out of.
 * The runtime puts the item straight back and reclaims the copy the player took,
 * which is why it never actually leaves.
 *
 * How it LOOKS is the item: give the script an item with the texture you want,
 * and that is the button's face. A custom texture therefore means a custom item
 * in the pack, not a texture path here.
 */
export const Button: FunctionComponent<ButtonProps> = (props: ButtonProps): JSX.Element =>
  Slot({ ...props, role: 'button' });
