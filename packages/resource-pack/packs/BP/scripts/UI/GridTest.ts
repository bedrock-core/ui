import { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { itemAuxMap } from '../data/auxMap';

const GRID_MAGIC = '§g§r§i§d';

const TEST_ITEMS = [
  'minecraft:diamond',
  'minecraft:golden_apple',
  'minecraft:netherite_sword',
  'minecraft:dirt',
  'minecraft:stone',
  'minecraft:oak_log',
  'minecraft:iron_ingot',
  'minecraft:coal',
  'minecraft:emerald',
];

export function showGridTest(player: Player): void {
  const form = new ActionFormData();

  form.title(GRID_MAGIC);

  for (const typeId of TEST_ITEMS) {
    form.button('', (itemAuxMap[typeId] ?? 0).toString());
  }

  form.show(player);
}
