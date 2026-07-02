/**
 * Label-font mapping shared by payload-driven text surfaces (currently the
 * dropdown's option labels). Mirrors the `Text` component's semantics: labels
 * render with `font_size: small` and a bound `font_scale_factor`, so a 1.0 scale
 * maps to factor 2 (1 / 0.5 base).
 */

/** Mirrors `Text`'s `FONT_SIZE_BASE`: `font_size: small` renders at 0.5× base. */
const FONT_SIZE_BASE = 0.5;

const FONT_TYPE_MAP = {
  mojangles: 'default',
  minecraftTen: 'MinecraftTen',
} as const;

export type LabelFont = keyof typeof FONT_TYPE_MAP;

export interface LabelStyle {
  /** Font family. Defaults to `'mojangles'`. */
  font?: LabelFont;
  /** Scale multiplier relative to the standard glyph size. Defaults to `1.0`. */
  scale?: number;
}

/**
 * Map a `LabelStyle` to the serialized font fields the RP label controls bind
 * (`font_type` + `font_scale_factor`, with `font_size: small` at 0.5× base — the
 * `text` component's exact shape).
 */
export function labelFontFields(style: LabelStyle = {}): { fontType: string; fontScaleFactor: number } {
  return {
    fontType: FONT_TYPE_MAP[style.font ?? 'mojangles'],
    fontScaleFactor: (style.scale ?? 1.0) / FONT_SIZE_BASE,
  };
}
