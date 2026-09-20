/**
 * Generator MULTI-FILE pattern: `[nameFn, dataFn, items]` — one .json block per
 * item, written next to this file (the generator filter transpiles every
 * non-script .ts in the packs at build time; this file never ships).
 *
 * `satisfies Many<Options, Block>` types the tuple against Mojang's official
 * block schema: `options` needs no annotation in either callback, components
 * autocomplete, and typos are errors. `satisfies` is erased at build time.
 */
type Options = {
  id: string; // used for output filename and identifier suffix
  displayName: string;
  mapColor: string;
  friction?: number;
  light?: number;
};

export default [
  options => `${options.id}.json`,
  options => ({
    'format_version': '1.21.0',
    'minecraft:block': {
      description: {
        identifier: `{{PACK_ID}}:${options.id}`,
        properties: {},
      },
      components: {
        'minecraft:map_color': options.mapColor,
        'minecraft:display_name': options.displayName,
        'minecraft:destructible_by_mining': { seconds_to_destroy: 0.8 },
        'minecraft:friction': options.friction ?? 0.4,
        'minecraft:light_emission': options.light ?? 0,
      },
    },
  }),
  [
    { id: 'tutorial_block', displayName: 'Tutorial Block', mapColor: '#9acd32', friction: 0.6 },
    { id: 'tutorial_block_red', displayName: 'Tutorial Block (Red)', mapColor: '#c0392b' },
    { id: 'tutorial_block_blue', displayName: 'Tutorial Block (Blue)', mapColor: '#2980b9', light: 7 },
  ],
] satisfies Many<Options, Block>;
