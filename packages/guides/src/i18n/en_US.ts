/**
 * This library's own strings — the default admonition titles the renderer
 * falls back to (`core.guides.adm.*`). Folded by the i18n Regolith filter into
 * every consuming addon's bundle and generated `.lang` via the
 * `bedrockCore.i18n` convention (namespace `core`, like the whole
 * bedrock-core family). Kind colors are baked into the values — titles render
 * as localized `Text` children, which cannot carry a `§` prefix.
 */
export default {
  guides: {
    adm: {
      note: '§7§lNote',
      tip: '§a§lTip',
      info: '§b§lInfo',
      warning: '§6§lWarning',
      danger: '§c§lDanger',
    },
  },
} as const;
