import { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import itemAuxMap from '../../data/itemAuxMap.generated.json';

const GRID_MAGIC = '§g§r§i§d';

const LIMIT_ENTRIES: Array<[label: string, typeId: string]> = [
  // ── Vanilla new-blocks: raw_id < 0, NO offset ever ──────────────────────────
  ['neg-max: froglight (-470)', 'minecraft:verdant_froglight'], // -30801920
  ['neg-min: prism_stairs (-2)', 'minecraft:prismarine_stairs'], // -131072

  // ── Vanilla legacy-blocks: 0 < raw_id < 256, NO offset ever ─────────────────
  ['block-min: stone (1)', 'minecraft:stone'], // 65536
  ['block-max: struct_block (252)', 'minecraft:structure_block'], // 16515072

  // ── Vanilla items: raw_id >= 256 (offset shifts by customItemCount=3) ─────────
  ['item-first: copper_spear(257)', 'minecraft:copper_spear'], // 17039360
  ['item-max: glow_berries (844)', 'minecraft:glow_berries'], // 55508992

  // ── Custom items: IDs 257+(index), aux = (257+index)*65536 ──────────────────
  // Vanilla items raw_id>=256 shift by +3 to make room (no collision)
  ['custom[0]: test:alpha', 'test:alpha_item'], // 16842752
  ['custom[1]: test:beta', 'test:beta_item'], // 16908288
  ['custom[2]: test:gamma', 'test:gamma_item'], // 16974848

  // ── Custom blocks (from terrain_texture.json, reverse-alpha sort) ───────────
  ['cblock[0]: test:block_two', 'test:block_two'], // -638648320
  ['cblock[1]: test:block_three', 'test:block_three'], // -638713856
  ['cblock[2]: test:block_one', 'test:block_one'], // -638779392
  ['cblock[3]: test:block_four', 'test:block_four'], // -638844928
];

export function showGridTest(player: Player): void {
  const form = new ActionFormData();

  form.title(GRID_MAGIC);

  for (const [label, typeId] of LIMIT_ENTRIES) {
    const aux = itemAuxMap[typeId] ?? 0;

    form.button(`${label}`, aux.toString());
  }

  form.show(player);
}
