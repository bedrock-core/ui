import type { AdmonitionKind, LangKey } from './types';

/** Key of the filter-generated default title for an admonition kind. */
export function defaultAdmonitionTitleKey(ns: string, kind: AdmonitionKind): LangKey {
  return `bcg.${ns}._adm.${kind}`;
}
