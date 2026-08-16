/**
 * CLDR plural categories for the locales the Bedrock client ships, as a
 * built-in rule table — Bedrock's script engine does not guarantee
 * `Intl.PluralRules`, so the engine never reaches for it.
 *
 * Rules are integer-oriented (counts in game text are counts); non-integers
 * take the `other` branch in the Slavic families rather than modeling CLDR's
 * fraction categories. Lookup falls back `_<category>` → `_other`, so a
 * missing category never strands a string.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export function pluralCategory(locale: string, count: number): PluralCategory {
  const lang = locale.slice(0, 2);
  const n = Math.abs(count);
  const int = Number.isInteger(n);

  switch (lang) {
    // No plural distinction.
    case 'ja': case 'ko': case 'zh': case 'id':
      return 'other';

    // i = 0 or 1 → one (CLDR: fr).
    case 'fr':
      return Math.trunc(n) === 0 || Math.trunc(n) === 1 ? 'one' : 'other';

    // one / few (2–4) / other.
    case 'cs': case 'sk':
      if (!int) { return 'other'; }

      if (n === 1) { return 'one'; }

      return n >= 2 && n <= 4 ? 'few' : 'other';

    // one / few (2–4 outside 12–14) / many.
    case 'pl': {
      if (!int) { return 'other'; }

      if (n === 1) { return 'one'; }

      const mod10 = n % 10;
      const mod100 = n % 100;

      return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'few' : 'many';
    }

    // one (…1 outside …11) / few (…2–4 outside …12–14) / many.
    case 'ru': case 'uk':
      return eastSlavic(n, int);

    // The n == 1 family: en, de, es, it, pt, nl, sv, da, nb, fi, hu, el, bg, tr…
    default:
      return int && n === 1 ? 'one' : 'other';
  }
}

function eastSlavic(n: number, int: boolean): PluralCategory {
  if (!int) { return 'other'; }

  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) { return 'one'; }

  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'few' : 'many';
}
