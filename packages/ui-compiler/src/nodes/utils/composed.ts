/**
 * The key a text the build composed per language is drawn through: named after
 * what it says in every language, so one composition is one key however many
 * screens draw it, and two that differ in any language never share one.
 */

/** FNV-1a over a string, from a given offset basis, as an unsigned 32-bit number. */
const fnv = (text: string, basis: number): number => {
  let hash = basis;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/** The key a composed text is drawn through. */
export const composedKey = (translations: Readonly<Record<string, string>>): string => {
  const canonical = JSON.stringify(Object.keys(translations).sort().map(locale => [locale, translations[locale]]));

  return `core.text.${fnv(canonical, 0x811c9dc5).toString(36)}${fnv(canonical, 0x050c5d1f).toString(36)}`;
};
