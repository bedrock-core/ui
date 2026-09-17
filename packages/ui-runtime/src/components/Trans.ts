import { buildLocales, takeWidthSlot, type ComposedRecord } from '../core/render/buildPass';
import { useTranslationResolver } from '../data/Translation';
import { FunctionComponent, JSX } from '../jsx';
import { parseTrans, splitTrans, TransError } from '../util/trans';
import { measureText } from '../util/textMetrics';
import type { ControlProps } from './control';
import { Panel } from './Panel';
import { Text, type TextFont } from './Text';

// The expander calls a component with the props it is given; the element type is the loose one.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- every element below hands Text the props it declares
const TEXT = Text as FunctionComponent;
const PANEL = Panel as FunctionComponent;

/** The props a component wrapping text as a style may set: the ones that leave the text's metrics alone. */
const STYLE_PROPS = new Set(['color', 'shadow', 'children', 'key']);

export interface TransProps extends ControlProps {
  /**
   * The key the text is written under, as `key()` returns it. The build reads its string in every
   * language the pack ships.
   */
  i18nKey?: string;
  /** The text in every language, by locale, tags and all, in place of `i18nKey`: for a tool that writes it itself. */
  translations?: Readonly<Record<string, string>>;
  /**
   * What the text's tags stand for, by tag name — or by index, for `<0>`, `<1>` and so on. A tag's
   * content is drawn inside its component: a `<Text>` styles it with its `color` and `shadow`, and
   * anything else, a `<Link>` or a `<Button>`, is a press hugging it.
   */
  components?: Readonly<Record<string, JSX.Element>> | readonly JSX.Element[];
  font?: TextFont;
  /** Scale relative to the standard glyph size, as on `<Text>`. */
  scale?: number;
  shadow?: boolean;
  color?: readonly [number, number, number];
}

/**
 * A translated text whose tags are components, drawn exactly where their text falls in whichever
 * language the player reads it.
 *
 * One label cannot make a few of its words pressable, and a press placed over words the build
 * measured lands wherever those words fall in its own language rather than the reader's. So the
 * build breaks the text itself, into the same number of lines in every language, and each line into
 * pieces — a stretch inside the same tags — whose strings differ per language. The client packs
 * each line at the widths it draws, and a press hugs its piece.
 *
 * Composed at the width the layout gives the text, which is known only once the screen is laid out:
 * the build lays the screen out again with it. A compiled screen rendered at runtime draws the
 * pieces its build recorded, so a press among them is an entry in the same place.
 */
export const Trans: FunctionComponent<TransProps> = ({ i18nKey, translations, components, font, scale, shadow, color, ...layout }: TransProps): JSX.Element => {
  const resolver = useTranslationResolver();
  const named = componentsByName(components);
  const names = new Set(named.keys());
  const locales = buildLocales();
  const slot = takeWidthSlot();
  const style = {
    ...font === undefined ? {} : { font },
    ...scale === undefined ? {} : { scale },
    ...shadow === undefined ? {} : { shadow },
    ...color === undefined ? {} : { color },
  };
  const where = i18nKey === undefined ? 'a <Trans>' : `<Trans i18nKey="${i18nKey}">`;
  const lineHeight = measureText({ text: 'A', font, fontSize: scale ?? 1 }).height;

  const draw = (lines: readonly (readonly { chain: readonly string[]; values: Readonly<Record<string, string>> }[])[], record?: ComposedRecord): JSX.Element => ({
    type: PANEL,
    props: {
      ...layout,
      height: lines.length * lineHeight,
      ...slot === undefined || locales === undefined ? {} : { __widthSlot: slot.slot },
      ...record === undefined ? {} : { __trans: record },
      children: lines.map((pieces, index): JSX.Element => ({
        type: PANEL,
        props: {
          stack: true,
          flexDirection: 'row',
          position: 'absolute',
          top: index * lineHeight,
          left: 0,
          width: '100%',
          height: lineHeight,
          children: pieces.map(piece => pieceOf(piece.chain, piece.values, named, style, where)),
        },
      })),
    },
  });

  // At runtime, a compiled screen draws what its build laid out.
  if (slot?.recorded !== undefined) {
    return draw(slot.recorded.l.map(line => line.map(piece => ({ chain: piece.c, values: { '': piece.v } }))));
  }

  const byLocale = textsOf({ i18nKey, translations, resolver, where });
  const defaultLocale = locales?.defaultLocale;
  const shown = (defaultLocale === undefined ? undefined : byLocale[defaultLocale]) ?? Object.values(byLocale)[0] ?? '';

  if (slot?.width === undefined || locales === undefined) {
    // The first pass, or no build at all: the default language's text with its tags taken out,
    // laid out to find the width the text is given.
    return {
      type: TEXT,
      props: {
        ...layout,
        ...style,
        wordBreak: 'break-word',
        children: parseTrans(shown, names, where).text,
        ...slot === undefined || locales === undefined ? {} : { __widthSlot: slot.slot },
      },
    };
  }

  const { lines } = splitTrans(byLocale, names, slot.width, font, scale ?? 1, where);
  const record: ComposedRecord = {
    s: slot.slot,
    l: lines.map(line => line.map(piece => ({ c: piece.chain, v: piece.values[locales.defaultLocale] ?? Object.values(piece.values)[0] ?? '' }))),
  };

  return draw(lines, record);
};

/** `components` by the name its tags use: a record's keys, or an array's indices. */
function componentsByName(components: TransProps['components']): Map<string, JSX.Element> {
  if (components === undefined) {
    return new Map();
  }

  return Array.isArray(components)
    ? new Map(components.map((element, index) => [String(index), element]))
    : new Map(Object.entries(components));
}

/** The text in every language: given, or read under `i18nKey` from the languages the build registered. */
function textsOf({ i18nKey, translations, resolver, where }: {
  i18nKey: string | undefined;
  translations: Readonly<Record<string, string>> | undefined;
  resolver: ((key: string) => string | undefined) | null;
  where: string;
}): Readonly<Record<string, string>> {
  if (translations !== undefined) {
    return translations;
  }

  if (i18nKey === undefined) {
    throw new TransError('<Trans> needs an i18nKey, or its translations.');
  }

  const locales = buildLocales();

  if (locales === undefined) {
    return { '': resolver?.(i18nKey) ?? i18nKey };
  }

  const { defaultLocale, tables } = locales;
  const fallback = tables[defaultLocale]?.[i18nKey];
  const texts = Object.fromEntries(Object.keys(tables).flatMap((locale): [string, string][] => {
    const value = tables[locale]?.[i18nKey] ?? fallback;

    return value === undefined ? [] : [[locale, value]];
  }));

  if (Object.keys(texts).length === 0) {
    console.warn(`[ui] ${where}: no language the pack ships has this key, so it is drawn as written`);

    return { [defaultLocale]: i18nKey };
  }

  return texts;
}

/** One piece: its text, styled by the `<Text>` components around it, inside the press around it when there is one. */
function pieceOf(
  chain: readonly string[],
  values: Readonly<Record<string, string>>,
  named: ReadonlyMap<string, JSX.Element>,
  style: Record<string, unknown>,
  where: string,
): JSX.Element {
  const around = chain.map((name) => {
    const element = named.get(name);

    if (element === undefined) {
      throw new TransError(`${where}: <${name}> has no component.`);
    }

    return { name, element };
  });
  const styles = around.filter(({ element }) => element.type === Text);
  const presses = around.filter(({ element }) => element.type !== Text);

  for (const { name, element } of styles) {
    const extra = Object.keys(element.props).filter(prop => !STYLE_PROPS.has(prop));

    if (extra.length > 0) {
      throw new TransError(`${where}: the <Text> for <${name}> sets ${extra.join(', ')}; a style may set color and shadow, which leave the text's width alone.`);
    }
  }

  if (presses.length > 1) {
    throw new TransError(`${where}: <${presses.map(press => press.name).join('> inside <')}> puts a press inside a press.`);
  }

  const styled: Record<string, unknown> = {};

  for (const { element } of styles) {
    const { children: _children, key: _key, ...own } = element.props;

    Object.assign(styled, own);
  }

  const text: JSX.Element = { type: TEXT, props: { ...style, ...styled, hug: true, __translations: values } };
  const [press] = presses;

  return press === undefined ? text : { ...press.element, props: { ...press.element.props, hug: true, children: text } };
}
