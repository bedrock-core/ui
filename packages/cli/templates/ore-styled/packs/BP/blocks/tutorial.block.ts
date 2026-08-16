/**
 * Generator MULTI-FILE pattern: `[nameFn, dataFn, items]` — one .json block per
 * item, written next to this file (the generator filter transpiles every
 * non-script .ts in the packs at build time; this file never ships).
 */
type Options = {
  id: string; // used for output filename and identifier suffix
  displayName: string;
  mapColor: string;
  friction?: number;
  light?: number;
};

export default [
  (options: Options): string => `${options.id}.json`,
  (options: Options) => {
    const identifier = `{{PACK_ID}}:${options.id}`;
    const friction = options.friction ?? 0.4;
    const light = options.light ?? 0;

    return {
      format_version: '1.21.0',
      'minecraft:block': {
        description: {
          identifier,
          properties: {},
        },
        components: {
          'minecraft:map_color': options.mapColor,
          'minecraft:display_name': options.displayName,
          'minecraft:destructible_by_mining': { seconds_to_destroy: 0.8 },
          'minecraft:friction': friction,
          'minecraft:light_emission': light,
        },
      },
    };
  },
  [
    { id: 'tutorial_block', displayName: 'Tutorial Block', mapColor: '#9acd32', friction: 0.6 },
    { id: 'tutorial_block_red', displayName: 'Tutorial Block (Red)', mapColor: '#c0392b' },
    { id: 'tutorial_block_blue', displayName: 'Tutorial Block (Blue)', mapColor: '#2980b9', light: 7 },
  ],
];
