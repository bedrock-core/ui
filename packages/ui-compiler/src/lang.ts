import { collectKind } from './nodes';
import type { IrNode } from './nodes/utils/types';

export { composedKey } from './nodes/utils/composed';

/**
 * The strings a compiled screen adds to the pack's languages.
 *
 * Text the build composes per language — a trail collapsed to the room it has,
 * the pieces of a paragraph — is drawn through a key the build mints. The key
 * is named after what the text says in every language, so one composition is
 * one key however many screens draw it, and two that differ in any language
 * never share one ({@link composedKey}). Nothing about the addon is in it:
 * two packs that mint the same key write the same strings under it.
 */

/** Each language's strings, by key. */
export type ScreenLang = Record<string, Record<string, string>>;

/** Every composed text under a node, as the strings each language gets. */
export const langOf = (root: IrNode): ScreenLang => {
  const lang: ScreenLang = {};

  for (const node of collectKind(root, 'text')) {
    if (node.translations === undefined) {
      continue;
    }

    for (const [locale, value] of Object.entries(node.translations)) {
      (lang[locale] ??= {})[node.text] = value;
    }
  }

  return lang;
};
