import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { Fill, type FillDirection } from './Fill';

export interface ProgressProps extends ControlProps {
  /** Addresses the value from the script side. Unique within a screen. */
  name: string;
  /** Empty state, drawn underneath. */
  track?: string;
  /** Full state, clipped to the current value. */
  fill?: string;
  /** Defaults to filling left-to-right. */
  direction?: FillDirection;
}

/**
 * A bar.
 *
 * Composed, not built in: it is a panel holding a whole image and a {@link Fill}
 * stacked on top of it, which is all a bar has ever been. Nothing here is
 * privileged — copy this component, swap the textures or the direction, and you
 * have a gauge, a fuel meter or a cooldown sweep. That is the point of keeping
 * the primitive set small.
 */
export const Progress: FunctionComponent<ProgressProps> = ({
  name,
  track = 'textures/ui/brewing_fuel_bar_empty',
  fill = 'textures/ui/brewing_fuel_bar_full',
  direction = 'left',
  ...rest
}: ProgressProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl({ height: 6, ...rest }),
    children: [
      // Both absolute, so they occupy the same box instead of stacking. The
      // clipped one is second, and therefore on top.
      {
        type: 'image',
        props: {
          ...withControl({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }),
          texture: track,
        },
      },
      Fill({
        name,
        texture: fill,
        direction,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }),
    ],
  },
});
