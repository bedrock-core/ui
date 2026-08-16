import type { AdmonitionKind, LangKey } from './types';

/**
 * Default title key for an admonition kind — this package's own typed
 * resource (`src/i18n/en_US.ts`), folded into every consuming addon's bundle
 * and `.lang` by the i18n filter. One fixed key per kind, no per-addon
 * derivation; a manifest block's `titleK` overrides it.
 */
export function defaultAdmonitionTitleKey(kind: AdmonitionKind): LangKey {
  return `core.guides.adm.${kind}`;
}
