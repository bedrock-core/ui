/**
 * Spanish. Same key set as en_US — the build fails on drift. Note `bought`
 * reorders {{price}} before {{item}}: the recorded argument order comes from
 * en_US, so the .lang output maps price to %2$s here and arguments still land
 * in the right slots. The `test.*` lorem is deliberately unchanged.
 */
export default {
  ui: {
    test: {
      long: 'Aliqua velit laborum ullamco dolor ullamco occaecat nisi labore cillum sint laboris anim minim et.',
      longBold: '§lAliqua velit laborum ullamco dolor ullamco occaecat nisi labore cillum sint laboris anim minim et.',
      multiline: 'Aliqua velit laborum ullamco dolor. Ullamco occaecat nisi labore cillum sint laboris anim minim et. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    },

    demo: {
      title: 'Demo de i18n',
      intro: 'Cada verbo de la librería, en vivo: $t(ui.demo.title).',
      locale: 'Idioma resuelto: {{locale}}',
      bought: 'Por {{price}} esmeraldas compraste {{item}}.',
      stock_one: 'Queda {{count}} artículo',
      stock_other: 'Quedan {{count}} artículos',
      apple: 'Manzana vainilla vía t(): {{name}}',
      pinned: 'es_ES fijado: {{value}}',

      section: {
        server: 'Resuelto en el servidor — t()',
        plurals: 'Plurales — count elige la forma',
        client: 'Resuelto en el cliente — key() / raw()',
        locale: 'Cadena de idioma y override',
      },

      action: {
        sendRaw: 'Enviar raw() al chat',
        sendRawVanilla: 'Enviar raw() vainilla al chat',
        sendRawPlural: 'Enviar raw() plural al chat ({{count}})',
        sendRawNested: 'Enviar raw() anidado al chat',
        overrideEs: 'Forzar idioma → es_ES',
        clearOverride: 'Quitar override',
      },
    },
  },
} as const;
