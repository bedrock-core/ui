import { withControl, type ControlProps } from '../control';
import { JSX } from '../../jsx';

/**
 * Build the host-element props for a modal control so the serializer + layout pass
 * produce a geometry-correct control-block payload — the SAME field layout (and the
 * SAME computed width/height/x/y from the flexbox engine) as an ActionForm component
 * like `Text`. The encoded `type` is the control's own slot type, so the RP modal
 * decoder gates on it; the styling tail (text/fontType/fontScaleFactor) carries the
 * label appearance. The resulting `payload` is what the writer hands to the native
 * control's label channel, where the RP decodes geometry + styling exactly like the
 * ActionForm `button`/`label` slots.
 *
 * `withControl` is applied so the modal control accepts the SAME control + layout props
 * as any other component (visible/enabled/background + width/height/flex/margin/…), and
 * the layout phase fills in `jsonUIWidth/Height/x/y` before serialization.
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
 * JSON UI feeds a label's `text` through a numeric string-format path, so a value
 * starting with a digit (or `-`) renders blank/garbled. A zero-width `§r` shifts the
 * leading character off the digit without changing what's shown. Mirrors `Text`'s
 * `safeLabelText` — see [[jsonui-text-leading-digit]].
 */
function safeLabelText(text: string): string {
  return /^[\d-]/.test(text) ? `§r${text}` : text;
}

/**
 * Assemble the serializable host-element props for a modal control's label payload.
 * Spreads `withControl` (canonical control + layout field order, geometry filled by the
 * layout phase) then the text-styling tail, matching the `text` component's encoded
 * layout so the RP modal decoders reuse its offsets.
 *
 * @param layout - Control/layout props the user passed to the `Form.*` control.
 * @param label - Display text (empty string when the control has no label).
 * @param style - Optional font/scale styling, matching `Text`.
 * @returns Props for the host element; the serializer encodes these into the payload.
 */
export function controlPayloadProps(layout: ControlProps, label: string, style: LabelStyle = {}): JSX.Props {
  return {
    ...withControl({ ...layout }),
    value: safeLabelText(label),
    fontType: FONT_TYPE_MAP[style.font ?? 'mojangles'],
    fontScaleFactor: (style.scale ?? 1.0) / FONT_SIZE_BASE,
  };
}
