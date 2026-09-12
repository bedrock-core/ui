/**
 * bedrock-core's own UI strings.
 *
 * The framework used to hardcode these in English, which meant a Spanish player got a Spanish
 * addon list inside an English window. Now it goes through exactly the mechanism addons use: the
 * strings are keyed under the `core` namespace and published into the merged translation table
 * when the UI mounts, so a player sees them in their own language wherever a translation exists.
 *
 * Because merge is last-write-wins per key, an addon that wants to rename something — "Addons" to
 * "Mods", say — can ship `core.addons.title` itself and win.
 *
 * This is the DEFAULT locale, and its shape is the type. Every other locale in this directory must
 * carry exactly these paths; the build checks it.
 */
export default {
  addons: {
    title: 'Addons',
    authors: 'Author(s):',
    version: 'Version: {{version}}',
    config: 'Config',
    guide: 'Guide',
  },

  errors: {
    notCompiled: 'This addon was built without its screens. Rebuild its pack with the ui-compile filter.',
  },

  config: {
    breadcrumb: 'Config',
    empty: 'Nothing here you can configure.',
  },

  scope: {
    server: {
      label: 'Server',
      hint: 'Applies everywhere in the world.',
    },
    dimension: {
      label: 'Dimension',
      hint: 'Applies only inside one dimension.',
    },
    player: {
      label: 'Player',
      hint: 'Applies only to one player.',
    },
  },

  roster: {
    noPlayers: 'No players online.',
    noDimensions: 'No dimensions found.',
  },

  paging: {
    previous: '<',
    next: '>',
    of: '{{page}} / {{pages}}',
  },

  reset: {
    question: 'Reset {{target}} to the defaults this addon ships with?',
    warning: 'Every setting it carries goes back to its default value. This cannot be undone.',
  },

  action: {
    save: 'Save',
    back: 'Back',
    cancel: 'Cancel',
    reset: 'Reset',
  },

  field: {
    numberRange: '({{min}} to {{max}})',
    enterNumber: 'Enter number',
    enterValue: 'Enter {{label}}',
  },

  list: {
    add: 'Add item',
    addTitle: 'Add to {{label}}',
    editTitle: 'Edit item',
    save: 'Save item',
    empty: 'Nothing in this list yet.',
    full: 'Full — {{max}} items is the maximum.',
    noOptions: 'Every option is already in the list.',
    item: 'Item',
  },

  command: {
    playerOnly: 'Must be run by a player',
    playerOrBlockOnly: 'Must be run by a player or a command block',
    operatorOnly: 'Only an operator can reach another scope',
    unknownSetting: 'Unknown setting',
    expectedBoolean: 'Expected true or false',
    expectedNumber: 'Expected a number',

    list: {
      empty: '(empty)',
      count: '({{count}}/{{max}})',
      whichItem: 'Which item? Usage: {{usage}}',
      scalarOnly: '{{verb}} only works on a list setting, and {{key}} is not one.',
      notAnOption: '\'{{item}}\' is not one of: {{options}}',
      duplicate: '\'{{item}}\' is already in the list.',
      repeated: '\'{{item}}\' is listed twice.',
      absent: '\'{{item}}\' is not in the list.',
      full: 'The list already holds its maximum of {{max}} items.',
      tooMany: 'That is {{count}} items; the maximum is {{max}}.',
    },
  },

  framework: {
    name: '@bedrock-core',
    creator: 'DrAv0011',
    description: 'The framework that powers every addon above.',
  },
} as const;
