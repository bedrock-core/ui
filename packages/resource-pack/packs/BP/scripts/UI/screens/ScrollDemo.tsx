import { Button } from '@bedrock-core/ore-styled';
import { ItemRenderer, Panel, Screen, Text, useExit, useSetScreen, type JSX } from '@bedrock-core/ui';
import { EnchantmentTypes, ItemComponentTypes, ItemStack } from '@minecraft/server';
import { MinecraftEnchantmentTypes, MinecraftItemTypes } from '@minecraft/vanilla-data';

/**
 * ScrollScreen demo — the default scrolling form with ItemRenderers.
 * Verifies that items render AND scroll with the content (enchanted items show
 * the glint). Enough rows are emitted to overflow the viewport so the
 * scrollbar actually engages.
 */
const ROW_ITEMS = [
  MinecraftItemTypes.DiamondSword,
  MinecraftItemTypes.GoldenApple,
  MinecraftItemTypes.BoneBlock,
  MinecraftItemTypes.EnderPearl,
  MinecraftItemTypes.NetheriteIngot,
  MinecraftItemTypes.Emerald,
];

function ItemRow({ label, items }: { label: string; items: string[] }): JSX.Element {
  const itemFunc = (id: string): JSX.Element => {
    const item = new ItemStack(id, 1);
    const enchantable = item.getComponent(ItemComponentTypes.Enchantable);
    const sharpness = EnchantmentTypes.get(MinecraftEnchantmentTypes.Sharpness);

    if (enchantable && sharpness) {
      enchantable.addEnchantment({
        type: sharpness,
        level: 5,
      });
    }

    return <ItemRenderer item={item} />;
  };

  return (
    <Panel flexDirection={'column'} gap={2}>
      <Text>{label}</Text>
      <Panel flexDirection={'row'} gap={4}>
        {items.map(itemFunc)}
      </Panel>
    </Panel>
  );
}

function ScrollContent(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8} background={'textures/ui/recipe_book_group_expanded'}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§b§lScroll Screen'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>

      <Text>{'§7Items rendered inside a scrolling form — scroll down to check they track:'}</Text>

      {/* Several rows so the content overflows and the scrollbar engages. */}
      <ItemRow label={'§7Row 1 — mixed items:'} items={ROW_ITEMS} />
      <ItemRow label={'§7Row 2 — mixed items:'} items={ROW_ITEMS} />
      <ItemRow label={'§7Row 3 — mixed items:'} items={ROW_ITEMS} />
      <ItemRow label={'§7Row 4 — mixed items:'} items={ROW_ITEMS} />
      <ItemRow label={'§7Row 5 — mixed items:'} items={ROW_ITEMS} />
      <ItemRow label={'§7Row 6 — mixed items:'} items={ROW_ITEMS} />

      <Text>{'§7End of list — the last rows should only be visible after scrolling.'}</Text>
    </Panel>
  );
}

export function ScrollDemo(): JSX.Element {
  // Default scrolling baseline — items must now be permitted here.
  useSetScreen(Screen.Scroll);

  return <ScrollContent />;
}
