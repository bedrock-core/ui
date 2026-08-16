import { interpolate, type DisplayText } from '@bedrock-core/i18n';
import { FunctionComponent, JSX } from '../jsx';
import { useTranslationResolver } from '../data/Translation';
import { type Writer } from '../core/types';
import { emitLabel } from '../core/writers';
import { ControlProps, withControl } from './control';
import { labelFontFields, type LabelFont } from './Form/controlPayload';

/** Public alias of the shared label font union (single source: controlPayload). */
export type TextFont = LabelFont;

/**
 * Element type emitted for `<Text shadow>`. JSON UI's label `shadow` is a load-time
 * property (not bindable), so shadow is routed at serialize time through a separate
 * component type: the RP mounts `text_shadow` as a sibling of `text` in both label
 * routers, gated by the standard `(#type = '…')` type gate, with a literal
 * `$shadow: true` on its label. Same writer, same payload contract as `text`.
 */
export const TEXT_SHADOW_TYPE = 'text_shadow';

/**
 * Element types for LOCALIZED overflow text (wordBreak/ellipsis/maxLines on a
 * localized child). The build side cannot pre-process a key — `props.value`
 * must stay the key and the RP resolves it at render — so these route to an RP
 * label variant whose width is bound to the control box, making Bedrock wrap
 * the resolved string natively. Raw text never uses them (it is pre-wrapped at
 * layout time and emitted as `text` / `text_shadow`).
 */
export const TEXT_WRAP_TYPE = 'text_wrap';
export const TEXT_SHADOW_WRAP_TYPE = 'text_shadow_wrap';

/** Whether an element type is one of the label-rendered text types. */
export function isTextElementType(type: unknown): boolean {
  return type === 'text' || type === TEXT_SHADOW_TYPE
    || type === TEXT_WRAP_TYPE || type === TEXT_SHADOW_WRAP_TYPE;
}

export type TextWordBreak = 'normal' | 'break-word';
export type TextOverflow = 'ellipsis';

export interface TextStyle {
  font?: TextFont;
}

export interface TextProps extends ControlProps {
  font?: TextFont;

  /**
   * Scale multiplier relative to the standard "normal" glyph size. Defaults to 1.0.
   * Values below 1.0 produce smaller text; values above 1.0 produce larger text.
   * Internally mapped to font_scale_factor accounting for the font_size:small base.
   */
  scale?: number;

  /**
   * The ONE text channel — v0008 collapsed key and text into the same wire
   * format (the payload's uncapped variable tail, read by a `localize: true`
   * label), so there is nothing to declare:
   *
   * - a **string** is auto-detected: if the active resolver knows it as a key
   *   (`key()` output, a registry display field, any published key), it is
   *   localized — the client resolves it in its own language. Otherwise it
   *   paints literally, exactly as Bedrock treats an unmatched key. The check
   *   only steers layout metrics and wrap routing; what paints is always the
   *   client's own resolution attempt.
   * - a **`RawMessage`** (`raw()` output) is always localized; WITH arguments
   *   it rides the rawtext tail and the CLIENT resolves and fills it — its
   *   own language, no length cap, `score`/`selector` parts included.
   *
   * Layout metrics need no wiring: the addon's `createI18n(bundle)` call
   * registers the default translation source; `TranslationContext` overrides
   * it for hosts resolving beyond their own bundle (config provides
   * `core.translations.forPlayer(player)`).
   */
  children?: DisplayText;

  /**
   * 'break-word': automatically wrap at word boundaries, with hyphens for mid-word breaks.
   * Width comes from the container — no explicit maxWidth needed.
   */
  wordBreak?: TextWordBreak;

  /**
   * 'ellipsis': truncate text that overflows its container with '...'.
   */
  overflow?: TextOverflow;

  /**
   * Limit rendered text to N lines. The last line is always ellipsized.
   */
  maxLines?: number;

  /** Fine-tune X nudge (px) of the rendered label inside its layout box. Default `0`. */
  offsetX?: number;
  /** Fine-tune Y nudge (px) of the rendered label inside its layout box. Default `0`. */
  offsetY?: number;

  /**
   * Drop shadow behind the glyphs (JSON UI `shadow`). Default `false`.
   * Resolved at serialize time: shadowed text emits the `text_shadow` element type,
   * which the RP routes to a label variant with a literal `shadow: true`.
   */
  shadow?: boolean;
}

/**
 * Make raw text safe to render as a Bedrock JSON UI label. JSON UI feeds a
 * label's `text` through a numeric string-format path, so a value that starts
 * with a digit (or a leading `-`) renders blank or garbled. Prefixing a
 * zero-width `§r` shifts the leading character off the digit without changing
 * what's shown — the section code is consumed by the renderer and the text
 * metrics already treat `§x` as zero-width, so width/layout are unaffected.
 */
export function safeLabelText(text: string): string {
  return /^[\d-]/.test(text) ? `§r${text}` : text;
}

export const Text: FunctionComponent<TextProps> = ({
  children,
  font,
  scale,
  wordBreak,
  overflow,
  maxLines,
  offsetX,
  offsetY,
  shadow,
  ...rest
}: TextProps): JSX.Element => {
  const resolvedScale = scale ?? 1.0;
  // Shared mapping (controlPayload): font alias + scale over the font_size:small 0.5× base.
  const labelFont = labelFontFields({ font, scale });

  if (Array.isArray(children)) {
    throw new Error('Text accepts a single string or RawMessage child — compose inside a RawMessage or use sibling <Text> elements.');
  }

  const rawChild = typeof children === 'object' && children !== null ? children : undefined;
  const stringChild = typeof children === 'string' ? children : undefined;

  // TranslationContext — populated at every root by the runtime (the addon's
  // default i18n instance, per player), shadowed by host providers. This
  // resolution feeds LAYOUT METRICS and key detection — what the client
  // paints is always its own resolution attempt (every tail goes through a
  // localize:true label).
  const resolver = useTranslationResolver();

  const translateKey = rawChild?.translate;
  const withArgs = rawChild?.with;
  const hasArgs = withArgs !== undefined && !(Array.isArray(withArgs) && withArgs.length === 0);

  let isLocalized: boolean;
  let resolvedText: string;

  if (rawChild !== undefined) {
    isLocalized = true;
    resolvedText = translateKey !== undefined
      ? (resolver?.(translateKey) ?? translateKey)
      : rawChild.text ?? '';

    if (translateKey !== undefined && hasArgs && withArgs !== undefined) {
      // Metrics fill: rawtext parameters resolve one translate level here;
      // score/selector parts have no server value and measure as ''.
      const params = Array.isArray(withArgs)
        ? withArgs
        : (withArgs.rawtext ?? []).map(param =>
            param.text ?? (param.translate !== undefined ? (resolver?.(param.translate) ?? param.translate) : ''));

      resolvedText = interpolate(resolvedText, params);
    }
  } else {
    // String auto-detection: a resolver hit means it is a key this world
    // publishes — localize it. A miss paints literally, which is ALSO what an
    // unmatched key does client-side, so a foreign key the server has not
    // seen still resolves on the client; only its wrap metrics approximate.
    const candidate = stringChild ?? '';
    const hit = candidate === '' ? undefined : resolver?.(candidate);

    isLocalized = hit !== undefined;
    resolvedText = hit ?? candidate;
  }

  // The payload's variable-length text tail (v0008) — uncapped:
  //  - key strings (explicit or auto-detected): the key; the RP label resolves it.
  //  - RawMessage: the message itself; the CLIENT resolves + fills it into the
  //    tail region (a §r part guards digit-leading resolutions the same way
  //    safeLabelText guards literal text). Argless translate collapses to its key.
  //  - literal text: as-is, digit-guarded.
  const tail: DisplayText = rawChild !== undefined
    ? (translateKey !== undefined && !hasArgs
        ? translateKey
        : { rawtext: [{ text: '§r' }, rawChild] })
    : isLocalized && stringChild !== undefined
      ? stringChild
      : safeLabelText(resolvedText);

  // Localized overflow text routes to the *_wrap types (see TEXT_WRAP_TYPE): the
  // RP wraps the resolved string in a box-sized label, since the text cannot be
  // pre-broken build-side (keys and client-filled tails alike). Raw overflow
  // text is pre-wrapped at layout time instead.
  const rpWraps = isLocalized
    && (wordBreak === 'break-word' || overflow === 'ellipsis' || maxLines !== undefined);

  return {
    // Shadow picks the component TYPE (see TEXT_SHADOW_TYPE): all types share this
    // writer and payload; the RP routers gate them apart with the standard type gate.
    type: shadow
      ? (rpWraps ? TEXT_SHADOW_WRAP_TYPE : TEXT_SHADOW_TYPE)
      : (rpWraps ? TEXT_WRAP_TYPE : 'text'),
    props: {
      ...withControl(rest),
      // The label GROUP contract (v0008, decoded sequentially from [1024]):
      // fontType, fontScale, x, y, text — text LAST, as the payload's variable
      // tail. Field ORDER is what the RP reads.
      fontType: labelFont.fontType,
      fontScaleFactor: labelFont.fontScaleFactor,
      labelX: offsetX ?? 0, // [1190] → label anchored X offset
      labelY: offsetY ?? 0, // [1273] → label anchored Y offset
      value: { tail },
      __textMetrics: {
        font,
        fontSize: resolvedScale,
        wordBreak,
        overflow,
        maxLines,
        // Resolved display string used by the layout phase for metrics.
        // For raw text this equals the tail; for localized text it's the
        // server-side resolution (the client paints its own).
        resolvedText,
        // True for localized texts: the tail holds a key or RawMessage the
        // client resolves, so the layout phase must never rewrite it with
        // processed display text. Raw text DOES get its wrapped/truncated
        // string committed — a JSON UI label is content-sized and never wraps
        // on its own, so the `\n`s must be in the string.
        isKey: isLocalized,
      },
    },
  };
};

/** Serializes a `text` or `text_shadow` into the static (label) slot. */
export const textWriter: Writer = (payload, form, ctx) => {
  emitLabel(payload, form, ctx);
};
