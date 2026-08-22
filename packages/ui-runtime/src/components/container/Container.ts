import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { CHEST_CANVAS } from './constants';

export interface ContainerProps extends ControlProps {
  children?: JSX.Node;
}

/**
 * The root of a compiled container screen.
 *
 * It exists to pin the canvas. A compiled layout is grafted into vanilla's chest
 * frame, so it is solved against 176 x 83 rather than the 320 x 210 canonical
 * screen the rest of the library uses — get that wrong and every offset in the
 * emitted JSON UI is subtly off. Making it a component means the size is stated
 * once, in the tree, instead of being a constant the filter has to remember.
 *
 * Everything else is an ordinary flex container: column by default, because a
 * container screen reads top to bottom.
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
