import type { AdmonitionKind, LangKey } from './types';

// Kind colors are baked into the generated title VALUES by the filter (a
// localization key can't carry a § prefix). This table exists for renderer
// accents that don't ride .lang — currently none, kept for Phase 3 strips.
export const ADMONITION_COLORS: Record<AdmonitionKind, string> = {
  note: '§7',
  tip: '§a',
  info: '§b',
  warning: '§6',
  danger: '§c',
};

/** Key of the filter-generated default title for an admonition kind. */
export function defaultAdmonitionTitleKey(ns: string, kind: AdmonitionKind): LangKey {
  return `bcg.${ns}._adm.${kind}`;
}
