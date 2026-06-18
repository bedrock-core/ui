import type { ScreenType } from '../core/types';

export type { ScreenType };

export {
  DualScroll,
  DUAL_SCROLL_TOTAL_WIDTH,
  DUAL_SCROLL_LEFT_WIDTH,
  DUAL_SCROLL_RIGHT_WIDTH,
  type DualScrollProps,
  type DualScrollSlotProps,
} from './DualScroll';

/**
 * Describes a screen kind: which RP JSON UI layout it activates (`type`).
 *
 * Pass a descriptor to `render(root, player, screen)` to choose the screen layout.
 */
export interface ScreenDescriptor {
  readonly type: ScreenType;
}

const Scroll: ScreenDescriptor = { type: 'scroll' };

/**
 * The built-in screen descriptors.
 *
 * - `Screen.Scroll` — default scrolling form; content scrolls when it exceeds the
 *   viewport and simply renders no scrollbar when it fits.
 *
 * Add new descriptors here as additional screen types (with distinct RP layouts) land.
 */
export const Screen = { Scroll } as const;

/** Session baseline used when none has been set yet. */
export const DEFAULT_SCREEN: ScreenDescriptor = Scroll;
