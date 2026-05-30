import type { ScreenType } from '../core/types';

export type { ScreenType };

/**
 * Describes a screen kind: which RP JSON UI layout it activates (`type`) and
 * whether ItemRenderer is permitted inside it (`allowsItems`).
 *
 * Pass a descriptor to `render(root, player, screen)` to choose the screen
 * layout and whether ItemRenderer is permitted.
 */
export interface ScreenDescriptor {
  readonly type: ScreenType;
  readonly allowsItems: boolean;
}

const Scroll: ScreenDescriptor = { type: 'scroll', allowsItems: false };
const Fixed: ScreenDescriptor = { type: 'fixed', allowsItems: true };

/**
 * The built-in screen descriptors.
 *
 * - `Screen.Scroll` — default scrolling form; no item rendering.
 * - `Screen.Fixed` — single non-scrolling page; item rendering stays aligned with controls.
 */
export const Screen = { Scroll, Fixed } as const;

/** Session baseline used when none has been set yet. */
export const DEFAULT_SCREEN: ScreenDescriptor = Scroll;
