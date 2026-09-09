/**
 * This addon's text, TS-first — the i18n filter turns this into
 * RP/texts/en_US.lang (keys prefixed `core.`), the runtime bundle, and the
 * types behind `t($ => $.…)`. This DEFAULT locale's shape is the contract:
 * every other locale file must carry exactly these paths.
 */
export default {
  ui: {},
} as const;
