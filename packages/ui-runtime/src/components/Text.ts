import { interpolate, type DisplayText } from '@bedrock-core/i18n';
import type { RawMessage } from '@minecraft/server';
import { FunctionComponent, JSX } from '../jsx';
import { useTranslationResolver } from '../data/Translation';
import { buildLocales } from '../core/render/buildPass';
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
   * A literal string, translation key or RawMessage. Translation resolution
   * supplies layout metrics. Forms let the client resolve keys and messages;
   * compiled static keys also resolve on the client. A dynamic container value
   * carries the display string resolved by the host's translation context.
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
   * Truncates literal text to this many UTF-16 code units without splitting a
   * surrogate pair. The compiler detects state-driven text automatically; each
   * detected container value carries at most 128 code units. Translation keys and client-resolved messages stay whole.
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
   * or let it grow. Live container text aligns its complete value.
   * Default `'left'`. Honoured by compiled screens; a
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
 * What only the composing parts of the library hand a `<Text>`: the string in
 * each language the pack ships, by locale, in place of `children`, for text the
 * build composes because what it says decides its shape — a trail collapsed to
 * its room, a piece of a `<Trans>` line. No `.lang` holds such a string, so the
 * build mints a key for it and writes each language's string under it.
 * `useComposed` and `<Trans>` set it; an author never does.
 */
interface ComposedTextProps {
  __translations?: Readonly<Record<string, string>>;
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
  __translations: translations,
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
}: TextProps & ComposedTextProps): JSX.Element => {
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

  // Composed per language: laid out in the default language, and never rewritten
  // by the layout, since the build draws it through a key of its own.
  const composed = translations === undefined ? undefined : composedValues(translations);

  if (composed !== undefined) {
    isLocalized = true;
    resolvedText = composed.shown;
  } else if (rawChild !== undefined) {
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
      resolvedText = resolvedText.slice(0, Math.max(0, Math.floor(maxLength))).replace(/[\uD800-\uDBFF]$/, '');
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
        // A display limit, kept outside the serialized payload fields.
        ...maxLength === undefined ? {} : { maxLength },
        // Drawn at the width of its glyphs: the box the layout solves is only
        // what the engine starts from, and the stack above re-places the row.
        ...hug === true ? { hug: true } : {},
        // Every language's string, for the build to write under the key it mints.
        ...composed === undefined ? {} : { translations: composed.values },
      },
    },
  };
};

/**
 * A composed text's strings, each guarded the way a literal label is, and the one it is laid out
 * with: the default language's, or the first one given outside a build.
 */
function composedValues(translations: Readonly<Record<string, string>>): { shown: string; values: Record<string, string> } {
  // A nonempty formatting reset keeps an empty localized value from falling back to its key.
  const values = Object.fromEntries(Object.entries(translations).map(([locale, value]) => [locale, value === '' ? '§r' : safeLabelText(value)]));
  const preferred = buildLocales()?.defaultLocale;
  const shown = (preferred === undefined ? undefined : values[preferred]) ?? Object.values(values)[0] ?? '';

  return { shown, values };
}

/** Literal length limit, or the host's full text capacity when none is set. */
export function textLimit(element: JSX.Element): number | undefined {
  if (!isTextElementType(element.type)) {
    return undefined;
  }

  const metrics = element.props.__textMetrics;
  const limit = typeof metrics === 'object' && metrics !== null && 'maxLength' in metrics ? metrics.maxLength : undefined;

  return typeof limit === 'number' && Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : Number.MAX_SAFE_INTEGER;
}
