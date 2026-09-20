import type { TranslationResolver } from '@bedrock-core/i18n';
import { buildLocales, takeWidthSlot } from '../core/render/buildPass';
import { useTranslationResolver } from '../data/Translation';

/** Composes what a text says in one language: `resolve` reads that language's strings, `width` is the room it has. */
export type Compose = (resolve: TranslationResolver, width: number | undefined) => string;

/** What {@link useComposed} gives back. */
export interface Composed {
  /** Spread on the `<Text>` that draws the composition: every language's string, or outside a build the one it composed. */
  text: Readonly<Record<string, unknown>>;
  /** Spread on the box whose width the composition has to fit, so the build lays it out at that width. */
  box: Record<string, unknown>;
}

/**
 * A string the build composes in every language the pack ships, at the width
 * the layout gives a box — a trail that drops what does not fit, in whichever
 * language it is read in.
 *
 * A compiled screen has one layout, but what fits in it depends on what the
 * text says, which is different in every language. So the build composes the
 * text once per language, from that language's strings, and the client draws
 * its own. The width is known only once the screen is laid out: `compose` is
 * first called with none, and again with the width the box was given.
 *
 * Outside a build the text is composed once, through the resolver the render
 * has, with no width.
 *
 * @param compose - What the text says in one language, given its strings and its room.
 */
export function useComposed(compose: Compose): Composed {
  const resolver = useTranslationResolver();
  const locales = buildLocales();
  const slot = takeWidthSlot();
  const box = slot === undefined || locales === undefined ? {} : { __widthSlot: slot.slot };

  if (locales === undefined) {
    return { text: { children: compose(key => resolver?.(key), undefined) }, box };
  }

  const { defaultLocale, tables } = locales;
  const translations = Object.fromEntries(Object.keys(tables).map((locale): [string, string] => [
    locale,
    compose(key => tables[locale]?.[key] ?? tables[defaultLocale]?.[key], slot?.width),
  ]));

  // Under a name only `<Text>` reads: the build draws it through a key it mints, which no author passes.
  const text = { __translations: translations };

  return { text, box };
}
