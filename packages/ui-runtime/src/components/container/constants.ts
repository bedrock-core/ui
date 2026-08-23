/**
 * Fixed dimensions of the container surface, measured against vanilla.
 *
 * A compiled screen replaces `chest.small_chest_panel` outright, so it owns the
 * whole screen rather than the strip above the player's inventory: the canvas is
 * `common.root_panel`, which vanilla sizes at 176 x 166 texels. Nothing vanilla
 * is drawn inside it unless the screen asks for it — see `Background`,
 * `PlayerInventory` and `Hotbar`.
 */
export const CHEST_CANVAS = {
  width: 176,
  height: 166,
} as const;

/** Vanilla's item cell. Every slot the engine draws is this size. */
export const SLOT_SIZE = 18;
