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

/** Options for one serialized label group (see {@link labelPayloadFields}). */
export interface LabelGroupOptions extends LabelStyle {
  /** Group text slot. `''` when the label's text comes from a native channel instead. */
  text?: string;
  /** Label top-left X offset (px) from its host frame. Default `0`. */
  x?: number;
  /** Label top-left Y offset (px) from its host frame. Default `0`. */
  y?: number;
}

/**
 * THE serialized label group — the single field layout every payload-styled label uses:
 * `[<prefix>Text, <prefix>FontType, <prefix>FontScale, <prefix>X, <prefix>Y]`, five
 * contiguous fields (5 × 83 bytes). The RP `core_ui_components.label` decodes the whole
 * group SEQUENTIALLY from one start offset (`$label_skip`), so a consumer only ever passes
 * where the group starts — never per-field offsets. The `prefix` keeps keys unique when one
 * payload carries several groups (e.g. the input's value + placeholder).
 */
export function labelPayloadFields(prefix: string, opts: LabelGroupOptions = {}): Record<string, string | number> {
  const font = labelFontFields(opts);

  return {
    [`${prefix}Text`]: opts.text ?? '',
    [`${prefix}FontType`]: font.fontType,
    [`${prefix}FontScale`]: font.fontScaleFactor,
    [`${prefix}X`]: opts.x ?? 0,
    [`${prefix}Y`]: opts.y ?? 0,
  };
}
