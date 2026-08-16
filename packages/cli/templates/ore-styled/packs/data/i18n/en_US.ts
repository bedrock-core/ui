/**
 * Your addon's text, TS-first. The i18n Regolith filter turns this into
 * namespaced .lang entries, a typed runtime bundle, and autocompletion for
 * every key and interpolation variable. This default locale's shape is the
 * contract: add es_ES.ts (etc.) with exactly these paths to translate.
 */
export default {
  example: {
    greeting: 'Hello {{name}}!',
  },
} as const;
