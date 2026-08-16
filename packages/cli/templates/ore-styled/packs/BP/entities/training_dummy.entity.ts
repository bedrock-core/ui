/**
 * Generator SINGLE-FILE pattern: a default-exported object becomes one .json
 * file with the same basename (training_dummy.entity.json).
 */
export default {
  format_version: '1.21.0',
  'minecraft:entity': {
    description: {
      identifier: '{{PACK_ID}}:training_dummy',
      is_summonable: true,
      is_spawnable: false,
      is_experimental: false,
    },
    components: {
      'minecraft:health': { value: 20, max: 20 },
      'minecraft:nameable': {},
      'minecraft:collision_box': { width: 0.6, height: 1.8 },
      'minecraft:physics': {},
    },
  },
};
