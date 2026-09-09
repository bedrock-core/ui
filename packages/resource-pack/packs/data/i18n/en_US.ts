/**
 * This addon's text, TS-first — the i18n filter turns this into
 * RP/texts/en_US.lang (keys prefixed `core.`), the runtime bundle, and the
 * types behind `t($ => $.…)`. This DEFAULT locale's shape is the contract:
 * every other locale file must carry exactly these paths.
 */
export default {
  ui: {
    players: {
      title: 'Players online',
      visit: 'Visit',
      count: '{{count}} online',
    },

    preferences: {
      title: 'Preferences',
      nickname: 'Nickname',
      nicknamePlaceholder: 'shown above your head',
      coordinates: 'Show coordinates',
      volume: 'Music volume',
      team: 'Team',
      view: 'View',
      viewFirst: 'First person',
      viewThird: 'Third person',
      save: 'Save',
      cancel: 'Cancel',
      saved: 'Preferences saved',
    },
  },
} as const;
