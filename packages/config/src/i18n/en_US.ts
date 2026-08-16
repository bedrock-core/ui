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

  config: {
    breadcrumb: 'Config',
    empty: 'Nothing here you can configure.',
    listOnly: 'This scope only has list settings.',
    unknownList: 'Unknown list setting.',
    listsElsewhere: 'List settings are edited from the previous screen.',
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

  list: {
    items: 'Items',
    add: 'Add',
    addItem: 'Add item',
    addPlaceholder: 'Enter {{label}} entry',
    empty: 'No items yet.',
    uncheckToRemove: 'Uncheck an item to remove it:',
    maxReached: 'Maximum of {{max}} items reached.',
  },

  reset: {
    question: 'Reset {{target}} to the defaults this addon ships with?',
    warning: 'Every setting it carries goes back to its default value. This cannot be undone.',
  },

  action: {
    save: 'Save',
    back: 'Back',
    reset: 'Reset',
  },

  field: {
    numberRange: '({{min}} to {{max}})',
    enterNumber: 'Enter number',
    enterValue: 'Enter {{label}}',
  },

  command: {
    playerOnly: 'Must be run by a player',
    playerOrBlockOnly: 'Must be run by a player or a command block',
    operatorOnly: 'Only an operator can reach another scope',
    unknownSetting: 'Unknown setting',
    expectedBoolean: 'Expected true or false',
    expectedNumber: 'Expected a number',
  },

  framework: {
    name: '@bedrock-core',
    creator: 'DrAv0011',
    description: 'The framework that powers every addon above.',
  },

  guides: {
    commands: {
      nav: 'Commands',
      intro: 'Every addon built on bedrock-core shares this screen. The list on the left is every addon installed in this world; pick one to reach its settings or its own guide.',
      title: 'Commands',
      namespace: 'Each addon registers its own commands under its own namespace, written as creator_pack. An addon by "bt" called "gc_graves" answers to bt_gc_graves. Type a slash and the start of a namespace to see what it offers.',
      cmd_config: '§econfig§r - open that addon\'s settings: the scope picker if you are an operator, your own settings otherwise',
      cmd_get: '§econfig get <setting>§r - read one of your own settings',
      cmd_set: '§econfig set <setting> <value>§r - change one of your own settings',
      cmd_guide: '§eguide§r - open that addon\'s guide, a page like this one',
      cmd_list: '§elist§r - open the addon list, the screen behind this one',
      autocomplete: 'Settings autocomplete: the chat box offers the ones that addon actually has.',
      h2: 'Operators',
      operators: 'Anyone can read and change their own settings. Changing what applies to the whole server, to a dimension, or to another player needs operator, and those commands are hidden from everyone else.',
      cmd_getat: '§econfigat get <scope.setting> [target]§r',
      cmd_setat: '§econfigat set <scope.setting> <value> [target]§r',
      scoped: 'The scope is part of the setting - server.pricing.tax_rate, player.allow_gifts. For a dimension or player setting, [target] names which one; leave it out to mean yourself, or the dimension you are standing in.',
      tip: 'Command blocks can run configat, so server settings can be driven by redstone or a datapack-style setup.',
    },
  },
} as const;
