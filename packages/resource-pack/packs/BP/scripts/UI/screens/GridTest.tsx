import { Button } from '@bedrock-core/ore-styled';
import { ItemAuxProvider, ItemRenderer, Panel, Screen, Text, useExit, useSetScreen, type JSX } from '@bedrock-core/ui';
import { ItemStack } from '@minecraft/server';

const ENTRIES: Array<[label: string, typeId: string]> = [
  // Vanilla new-blocks: raw_id < 0
  ['neg-max: froglight (-470)', 'minecraft:verdant_froglight'],
  ['neg-min: prism_stairs (-2)', 'minecraft:prismarine_stairs'],
  // Vanilla legacy-blocks: 0 < raw_id < 256
  ['block-min: stone (1)', 'minecraft:stone'],
  ['block-max: struct_block (252)', 'minecraft:structure_block'],
  // Vanilla items: raw_id >= 256
  ['item-first: copper_spear (257)', 'minecraft:copper_spear'],
  // Regression: first correctable item (shiftThreshold=632)
  ['correctable-first: honeycomb (632)', 'minecraft:honeycomb'],
  // Regression: confirmed-failing in dev builds before calibration fix
  ['correctable-mid: netherite_sword (646)', 'minecraft:netherite_sword'],
  ['correctable-high: orange_harness (766)', 'minecraft:orange_harness'],
  ['item-max: glow_berries (844)', 'minecraft:glow_berries'],
  // Custom items
  ['custom[0]: test:alpha', 'test:alpha_item'],
  ['custom[1]: test:beta', 'test:beta_item'],
  ['custom[2]: test:gamma', 'test:gamma_item'],
  // Custom blocks
  ['cblock[0]: test:block_two', 'test:block_two'],
  ['cblock[1]: test:block_three', 'test:block_three'],
  ['cblock[2]: test:block_one', 'test:block_one'],
  ['cblock[3]: test:block_four', 'test:block_four'],
];

function GridTestContent(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={4} padding={8} background={'textures/ui/recipe_book_group_expanded'}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§b§lItem ID Grid Test'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>
      <Panel flexDirection={'row'} gap={12}>
        <Panel flexDirection={'column'} gap={4}>
          {ENTRIES.slice(0, 7).map(([label, typeId]) => (
            <Panel flexDirection={'row'} gap={6} alignItems={'center'}>
              <ItemRenderer item={new ItemStack(typeId, 1)} />
              <Text>{`§7${label}`}</Text>
            </Panel>
          ))}
        </Panel>
        <Panel flexDirection={'column'} gap={4}>
          {ENTRIES.slice(7).map(([label, typeId]) => (
            <Panel flexDirection={'row'} gap={6} alignItems={'center'}>
              <ItemRenderer item={new ItemStack(typeId, 1)} />
              <Text>{`§7${label}`}</Text>
            </Panel>
          ))}
        </Panel>
      </Panel>
    </Panel>
  );
}

export function GridTest(): JSX.Element {
  useSetScreen(Screen.Fixed);

  return (
    <ItemAuxProvider>
      <GridTestContent />
    </ItemAuxProvider>
  );
}
