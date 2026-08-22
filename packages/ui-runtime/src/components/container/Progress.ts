import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';

/** Which way the fill grows. Matches JSON UI's `clip_direction`. */
export type FillDirection = 'left' | 'right' | 'up' | 'down' | 'center';

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
 * A bar whose fill tracks a number the script owns.
 *
 * Nothing about the value is written here. The compiler allocates a bank slot
 * behind it, the runtime writes that slot when the value changes, and the engine
 * redraws — while the screen stays open, with no reopen and no reserialization.
 *
 * Resolution comes from the item backing the channel: a netherite-tier marker
 * gives 2031 steps, which is finer than the bar is wide.
 */
export const Progress: FunctionComponent<ProgressProps> = ({
  name,
  track = 'textures/ui/brewing_fuel_bar_empty',
  fill = 'textures/ui/brewing_fuel_bar_full',
  direction = 'left',
  ...rest
}: ProgressProps): JSX.Element => ({
  type: 'container_bar',
  props: {
    ...withControl({ height: 6, ...rest }),
    name,
    trackTexture: track,
    fillTexture: fill,
    direction,
  },
});
