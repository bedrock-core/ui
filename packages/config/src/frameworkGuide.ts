/**
 * The built-in guide for bedrock-core itself.
 *
 * The framework has a row in the addon list but no realm behind it — nothing calls
 * `core.register()` on its behalf — so it can never publish a guide the way an addon does. This
 * manifest stands in, served locally by the `Guide` screen instead of read from replicated state.
 *
 * Its text is written as literal strings where an addon's guide would carry localization keys.
 * `Text` renders an unmatched key literally, so both work; a generated guide uses keys because
 * its `.lang` files ship with the pack, and this one has no pack to ship with. It also never
 * crosses the transport, so the size budget a replicated manifest lives under does not apply.
 */
import type { GuideManifest } from '@bedrock-core/guides';

/** The list row and guide id for the framework's own entry. Not a namespace — nothing registers it. */
export const FRAMEWORK_ADDON_ID = 'bedrock-core';

const PAGE = 'commands';

export const frameworkGuide: GuideManifest = {
  v: 1,
  ns: 'bedrock_core',
  defaultLocale: 'en_US',
  locales: ['en_US'],
  tree: [{ t: 'page', id: PAGE, titleK: 'Commands' }],
  pages: {
    [PAGE]: {
      id: PAGE,
      titleK: 'bedrock-core',
      blocks: [
        {
          t: 'p',
          runs: [{ k: 'Every addon built on bedrock-core shares this screen. The list on the left is every addon installed in this world; pick one to reach its settings or its own guide.' }],
        },
        { t: 'h', l: 2, k: 'Commands' },
        {
          t: 'p',
          runs: [{ k: 'Each addon registers its own commands under its own namespace, written as creator_pack. An addon by "bt" called "gc_graves" answers to bt_gc_graves. Type a slash and the start of a namespace to see what it offers.' }],
        },
        {
          t: 'ul',
          items: [
            { runs: [{ k: '§econfig§r - open this screen at that addon' }] },
            { runs: [{ k: '§econfig get <setting>§r - read one of your own settings' }] },
            { runs: [{ k: '§econfig set <setting> <value>§r - change one of your own settings' }] },
            { runs: [{ k: '§eguide§r - open that addon\'s guide' }] },
            { runs: [{ k: '§elist§r - open this list' }] },
          ],
        },
        {
          t: 'p',
          runs: [{ k: 'Settings autocomplete: the chat box offers the ones that addon actually has.' }],
        },
        { t: 'h', l: 2, k: 'Operators' },
        {
          t: 'p',
          runs: [{ k: 'Anyone can read and change their own settings. Changing what applies to the whole server, to a dimension, or to another player needs operator, and those commands are hidden from everyone else.' }],
        },
        {
          t: 'ul',
          items: [
            { runs: [{ k: '§econfigat get <scope.setting> [target]§r' }] },
            { runs: [{ k: '§econfigat set <scope.setting> <value> [target]§r' }] },
          ],
        },
        {
          t: 'p',
          runs: [{ k: 'The scope is part of the setting - server.pricing.tax_rate, player.allow_gifts. For a dimension or player setting, [target] names which one; leave it out to mean yourself, or the dimension you are standing in.' }],
        },
        {
          t: 'adm',
          kind: 'tip',
          blocks: [{
            t: 'p',
            runs: [{ k: 'Command blocks can run configat, so server settings can be driven by redstone or a datapack-style setup.' }],
          }],
        },
      ],
    },
  },
};
