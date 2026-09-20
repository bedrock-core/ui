/**
 * Your addon's text, TS-first. The i18n Regolith filter turns this into
 * namespaced .lang entries, a typed runtime bundle, and autocompletion for
 * every key and interpolation variable. This default locale's shape is the
 * contract: add es_ES.ts (etc.) with exactly these paths to translate.
 *
 * `meta.*` are the registry display fields: the `packName` / `creatorName` /
 * `description` passed to `core.register()` in main.ts ARE these keys (via
 * `i18n.key()`), so other addons' UIs render them in each player's language.
 */
export default {
  meta: {
    name: '{{PROJECT_NAME}}',
    description: '{{DESCRIPTION}}',
    creator: '{{AUTHOR}}',
  },
  example: {
    greeting: 'Hello {{name}}, welcome back!',
    // Plural leaf: `_one`/`_other` collapse into `example.points` taking `count`.
    points_one: 'You have {{count}} point',
    points_other: 'You have {{count}} points',
  },
} as const;
