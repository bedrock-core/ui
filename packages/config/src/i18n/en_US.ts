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

  guides: {
    commands: {
      nav: 'Commands',
      intro: 'Every addon built on bedrock-core shares this screen. The list on the left is every addon installed in this world; pick one to reach its settings or its own guide.',
      title: 'Commands',
      namespace: 'Each addon registers its own commands under its own namespace, written as creator_pack. An addon by "bt" called "gc_graves" answers to bt_gc_graves. Type a slash and the start of a namespace to see what it offers.',
      cmd_config: '§econfig§r - open that addon\'s settings: the scope picker if you are an operator, your own settings otherwise',
      cmd_get: '§econfig get <setting>§r - read one of your own settings',
      cmd_set: '§econfig set <setting> <value>§r - change one of your own settings',
      cmd_add: '§econfig add <setting> <item>§r - append one item to a list setting',
      cmd_remove: '§econfig remove <setting> <item>§r - take one item back out of a list setting',
      cmd_guide: '§eguide§r - open that addon\'s guide, a page like this one',
      cmd_list: '§elist§r - open the addon list, the screen behind this one',
      autocomplete: 'Settings autocomplete: the chat box offers the ones that addon actually has.',
      lists: 'A list setting holds several values. The config screen edits it on a page of its own - a form has no control for it, so it only gets one where there is room for a button. The commands work anywhere: get shows the items and how many of the maximum are used, set replaces the whole list from one comma-separated value in quotes ("tnt, lava_bucket"), and add and remove change a single item.',
      h2: 'Operators',
      operators: 'Anyone can read and change their own settings. Changing what applies to the whole server, to a dimension, or to another player needs operator, and those commands are hidden from everyone else.',
      cmd_getat: '§econfigat get <scope.setting> [target]§r',
      cmd_setat: '§econfigat set <scope.setting> <value> [target]§r',
      cmd_addat: '§econfigat add|remove <scope.setting> <item> [target]§r',
      scoped: 'The scope is part of the setting - server.pricing.tax_rate, player.allow_gifts. For a dimension or player setting, [target] names which one; leave it out to mean yourself, or the dimension you are standing in.',
      tip: 'Command blocks can run configat, so server settings can be driven by redstone or a datapack-style setup.',
    },
  },
} as const;
