import type { ScreenType } from '../core/types';

export type { ScreenType };

/**
 * Describes a screen kind: which RP JSON UI layout it activates (`type`).
 *
 * Pass a descriptor to `render(root, player, screen)` to choose the screen layout.
 */
export interface ScreenDescriptor {
  readonly type: ScreenType;
}

const Scroll: ScreenDescriptor = { type: 'scroll' };
const Fixed: ScreenDescriptor = { type: 'fixed' };

/**
 * The built-in screen descriptors.
 *
 * - `Screen.Scroll` — default scrolling form; items scroll with the content.
 * - `Screen.Fixed` — single non-scrolling page; item rendering stays aligned with controls.
 */
export const Screen = { Scroll, Fixed } as const;

/** Session baseline used when none has been set yet. */
export const DEFAULT_SCREEN: ScreenDescriptor = Scroll;
