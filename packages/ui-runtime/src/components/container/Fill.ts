import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';

/** Which way the fill grows. Matches JSON UI's `clip_direction`. */
export type FillDirection = 'left' | 'right' | 'up' | 'down' | 'center';

export interface FillProps extends ControlProps {
  /** Addresses the value from the script side. Unique within a screen. */
  name: string;
  texture: string;
  /** Defaults to filling left-to-right. */
  direction?: FillDirection;
}

/**
 * An image revealed in proportion to a number the script owns.
 *
 * This is the only bar-shaped primitive there is, and it is deliberately not a
 * bar: put a whole image behind one of these and you have a progress bar, but
 * the same pair also makes a gauge, a fuel meter, a cooldown sweep or a health
 * bar. Nothing about "bar" needed to be built in.
 *
 * It costs one bank slot. Resolution comes from the item behind it — a
 * netherite-tier marker gives 2031 steps, finer than any bar is wide.
 */
export const Fill: FunctionComponent<FillProps> = ({
  name,
  texture,
  direction = 'left',
  ...rest
}: FillProps): JSX.Element => ({
  type: 'image',
  props: {
    ...withControl(rest),
    name,
    texture,
    clip: true,
    direction,
  },
});
