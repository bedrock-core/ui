import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';

/** Which way the fill grows. Matches JSON UI's `clip_direction`. */
export type FillDirection = 'left' | 'right' | 'up' | 'down' | 'center';

export interface FillProps extends ControlProps {
  texture: string;
  /** How much of the texture to reveal, 0..1. */
  value?: number;
  /** Defaults to filling left-to-right. */
  direction?: FillDirection;
}

/**
 * An image revealed in proportion to a number.
 *
 * This is the only bar-shaped primitive there is, and it is deliberately not a
 * bar: put a whole image behind one and you have a progress bar, but the same
 * pair makes a gauge, a fuel meter, a cooldown sweep or a health bar. Nothing
 * about "bar" needed to be built in.
 *
 * It costs one container slot. Resolution comes from the item behind it — a
 * netherite-tier marker gives 2031 steps, finer than any bar is wide.
 */
export const Fill: FunctionComponent<FillProps> = ({
  texture,
  value = 0,
  direction = 'left',
  ...rest
}: FillProps): JSX.Element => ({
  type: 'image',
  props: {
    ...withControl(rest),
    texture,
    clip: true,
    value,
    direction,
  },
});
