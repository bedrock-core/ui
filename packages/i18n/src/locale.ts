/**
 * Locale policy, in one place. The ui-runtime deliberately has none — it looks
 * keys up in a record; which record, and for whom, is decided here.
 */

/**
 * Pick the best available locale for an ordered list of candidates. Per
 * candidate: exact match first, then a sibling region of the same language —
 * a player on unauthored `es_MX` gets Spanish written for Spain rather than
 * English. Then the default locale, then anything at all.
 */
export function pickLocale(
  available: readonly string[],
  candidates: readonly (string | undefined)[],
  defaultLocale: string,
): string | undefined {
  const set = new Set(available);

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === '') { continue; }

    if (set.has(candidate)) { return candidate; }

    const language = `${candidate.split('_')[0]}_`;
    const sibling = [...available].filter(locale => locale.startsWith(language)).sort()[0];

    if (sibling !== undefined) { return sibling; }
  }

  if (set.has(defaultLocale)) { return defaultLocale; }

  return available[0];
}
