/** Reference screen dimensions in texels. */
export const SCREEN = {
  POCKET: { width: 320, height: 210 },
  DESKTOP: { width: 376, height: 250 },
} as const;

/**
 * The canonical screen used as the default root reference for layout.
 * Percentage values on the root node resolve against these dimensions.
 * Pocket is chosen as the canonical screen because it is the smallest
 * supported target — layouts that fit here scale up on Desktop.
 */
export const CANONICAL_SCREEN = SCREEN.POCKET;
