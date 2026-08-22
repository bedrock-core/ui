/**
 * Fixed dimensions of the container surface, measured against vanilla.
 *
 * The chest screen's own frame is not ours to move: the compiled layout is
 * grafted into `chest.small_chest_panel_top_half`, which vanilla sizes at
 * 176 x 83 texels. Everything a compiled screen draws lives inside that box, so
 * it is the root the flexbox pass solves against.
 */
export const CHEST_CANVAS = {
  width: 176,
  height: 83,
} as const;

/** Vanilla's item cell. Every slot the engine draws is this size. */
export const SLOT_SIZE = 18;
