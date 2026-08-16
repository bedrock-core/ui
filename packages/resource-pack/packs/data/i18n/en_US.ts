/**
 * This addon's text, TS-first — the i18n filter turns this into
 * RP/texts/en_US.lang (keys prefixed `bc_ui.`), the runtime bundle, and the
 * types behind `t($ => $.…)`. This DEFAULT locale's shape is the contract:
 * every other locale file must carry exactly these paths.
 *
 * `test.*` migrated from the hand-written .lang entries the FontMetrics screen
 * measured; `demo.*` feeds the I18nDemo screen, which exercises every verb.
 */
export default {
  test: {
    long: 'Aliqua velit laborum ullamco dolor ullamco occaecat nisi labore cillum sint laboris anim minim et.',
    longBold: '§lAliqua velit laborum ullamco dolor ullamco occaecat nisi labore cillum sint laboris anim minim et.',
    multiline: 'Aliqua velit laborum ullamco dolor. Ullamco occaecat nisi labore cillum sint laboris anim minim et. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },

  demo: {
    title: 'i18n Demo',
    intro: 'Every verb the library has, live: $t(demo.title).',
    locale: 'Resolved locale: {{locale}}',
    bought: 'You bought {{item}} for {{price}} emeralds.',
    stock_one: '{{count}} item in stock',
    stock_other: '{{count}} items in stock',
    apple: 'Vanilla apple via t(): {{name}}',
    pinned: 'Pinned es_ES: {{value}}',

    section: {
      server: 'Server-resolved — t()',
      plurals: 'Plurals — count picks the form',
      client: 'Client-resolved — key() / raw()',
      locale: 'Locale chain & override',
    },

    action: {
      sendRaw: 'Send raw() to chat',
      sendRawVanilla: 'Send vanilla raw() to chat',
      sendRawPlural: 'Send plural raw() to chat ({{count}})',
      sendRawNested: 'Send nested raw() to chat',
      overrideEs: 'Override language → es_ES',
      clearOverride: 'Clear override',
    },
  },
} as const;
