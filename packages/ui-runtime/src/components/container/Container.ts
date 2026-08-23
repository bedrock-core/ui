import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { CHEST_CANVAS } from './constants';

export interface ContainerProps extends ControlProps {
  children?: JSX.Node;
}

/**
 * The root of a compiled container screen.
 *
 * It exists to pin the canvas. A compiled screen REPLACES the chest screen, so
 * it is solved against `common.root_panel` at 176 x 166 rather than the
 * 320 x 210 canonical screen the rest of the library uses — get that wrong and
 * every offset in the emitted JSON UI is subtly off. Making it a component
 * means the size is stated once, in the tree, instead of being a constant the
 * filter has to remember.
 *
 * Its children are absolute by default rather than stacked, because the things
 * that go directly on a chest screen — the background, the player's inventory,
 * the hotbar, your own panel — each know where they belong. Put a flex Panel
 * inside for anything that should flow.
 */
export const Container: FunctionComponent<ContainerProps> = (
  { children, ...rest }: ContainerProps,
): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl({
      width: CHEST_CANVAS.width,
      height: CHEST_CANVAS.height,
      flexDirection: 'column',
      ...rest,
    }),
    children,
  },
});
