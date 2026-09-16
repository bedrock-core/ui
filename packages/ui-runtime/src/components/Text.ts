import { interpolate, type DisplayText } from '@bedrock-core/i18n';
import type { RawMessage } from '@minecraft/server';
import { FunctionComponent, JSX } from '../jsx';
import { useTranslationResolver } from '../data/Translation';
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

  /**
   * The most characters the text will ever need.
   *
   * In a container screen this is what makes the text LIVE: a compiled layout
   * cannot grow, so a string that changes at runtime has to reserve its cells
   * before the build knows what it will say — one container slot per
   * character, decoded through the character table. Leave it off for text that
   * never changes, which is baked and may use any character at all.
   *
   * In a server form the text is live anyway; a literal string is cut to this
   * length so the two backends agree on what fits. Keys and messages the client
   * resolves are left whole.
   */
  maxLength?: number;

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

  /**
   * Glyph colour as RGB in 0..1 (JSON UI `color`). For text a `§` code cannot
   * colour: a localization key, whose value the client resolves and which
   * cannot carry a code of its own. Honoured by compiled screens; a serialized
   * screen's payload has no field for it and paints the default.
   */
  color?: readonly [number, number, number];

  /**
   * Where the glyphs sit in the label's box (JSON UI `text_alignment`), which
   * only shows when the box is wider than the text: give the text a `width`,
   * or let it grow. Default `'left'`. Honoured by compiled screens; a
   * serialized screen's payload has no field for it.
   */
  textAlign?: TextAlign;

  /**
   * Draw the label at the width of its glyphs rather than in the box the
   * layout solved for it, and let the engine place what follows.
   *
   * For a row of strings whose lengths are only known when the screen is shown
   * — a breadcrumb trail, a run of names — inside a `<Panel stack>`: the box a
   * compiled screen solves is as wide as the longest string it may ever hold,
   * so a short one would leave the rest of that box as air. A hugging label
   * holds no air, and an empty one takes no room at all.
   *
   * Only inside a stack. Anywhere else the neighbours keep the places the
   * layout gave them and a hugging label simply draws narrower than its box.
   */
  hug?: boolean;
}

export type TextAlign = 'left' | 'center' | 'right';

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
  maxLength,
  offsetX,
  offsetY,
  shadow,
  color,
  textAlign,
  hug,
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

  // One part as the server reads it: a literal as written, a key through the
  // resolver. `score` and `selector` parts have no server value and measure as
  // '' — the client fills those.
  const partText = (part: RawMessage): string =>
    part.text ?? (part.translate !== undefined ? (resolver?.(part.translate) ?? part.translate) : '');

  if (rawChild !== undefined) {
    isLocalized = true;
    resolvedText = translateKey !== undefined
      ? (resolver?.(translateKey) ?? translateKey)
      : rawChild.rawtext !== undefined
        ? rawChild.rawtext.map(partText).join('')
        : rawChild.text ?? '';

    if (translateKey !== undefined && hasArgs && withArgs !== undefined) {
      // Metrics fill: rawtext parameters resolve one translate level here.
      const params = Array.isArray(withArgs) ? withArgs : (withArgs.rawtext ?? []).map(partText);

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

    if (!isLocalized && maxLength !== undefined) {
      resolvedText = resolvedText.slice(0, Math.max(0, Math.floor(maxLength)));
    }
  }

  // The payload's variable-length text tail (v0008) — uncapped:
  //  - key strings (explicit or auto-detected): the key; the RP label resolves it.
  //  - RawMessage: the message itself; the CLIENT resolves + fills it into the
  //    tail region (a §r part guards digit-leading resolutions the same way
  //    safeLabelText guards literal text). Argless translate collapses to its key.
  //  - literal text: as-is, digit-guarded.
  //  - a message already holding parts is SPLICED in rather than nested, so one
  //    flat rawtext travels — which is what a trail composed of several keys is.
  const tail: DisplayText = rawChild !== undefined
    ? (translateKey !== undefined && !hasArgs
        ? translateKey
        : {
            rawtext: [
              { text: '§r' },
              ...translateKey === undefined && rawChild.text === undefined && rawChild.rawtext !== undefined
                ? rawChild.rawtext
                : [rawChild],
            ],
          })
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
      // The COMMON font slot at [606-688]. Assigning an existing key does not move
      // it, so this overwrites withControl's 'default' in place rather than
      // appending — the RP's label leaves read the font from here for every cell
      // type, which is what keeps texture paths out of #font_type.
      fontType: labelFont.fontType,
      // The label GROUP contract (v0008, decoded sequentially from [1024]):
      // labelFontType, fontScale, x, y, text — text LAST, as the payload's variable
      // tail. Field ORDER is what the RP reads. `labelFontType` is the group's
      // original font slot; the cell label now sources [606] instead, but the slot
      // stays so every later group offset (labelX [1190], labelY [1273], tail) and
      // every sub-element group that still reads its own slot 1 are unchanged.
      labelFontType: labelFont.fontType,
      fontScaleFactor: labelFont.fontScaleFactor,
      labelX: offsetX ?? 0, // [1190] → label anchored X offset
      labelY: offsetY ?? 0, // [1273] → label anchored Y offset
      // Under a private name: a colour is drawn by the compiled label alone,
      // and a plain prop would be offered to every other reader of the element.
      ...color === undefined ? {} : { __color: color },
      ...textAlign === undefined ? {} : { __textAlign: textAlign },
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
        // The container backend's reservation. Here rather than a plain prop so
        // it never becomes a payload field.
        ...maxLength === undefined ? {} : { maxLength },
        // Drawn at the width of its glyphs: the box the layout solves is only
        // what the engine starts from, and the stack above re-places the row.
        ...hug === true ? { hug: true } : {},
      },
    },
  };
};

/**
 * Characters a built `<Text>` reserved with `maxLength`, or undefined when the
 * label is baked — how the container backend tells live text from static.
 */
export function liveTextLength(element: JSX.Element): number | undefined {
  if (!isTextElementType(element.type)) {
    return undefined;
  }

  const metrics = element.props.__textMetrics;

  if (typeof metrics !== 'object' || metrics === null || !('maxLength' in metrics)) {
    return undefined;
  }

  const { maxLength } = metrics;

  return typeof maxLength === 'number' && maxLength >= 1 ? Math.floor(maxLength) : undefined;
}
