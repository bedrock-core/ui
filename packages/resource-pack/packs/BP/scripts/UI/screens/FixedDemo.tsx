import { ItemAuxContext, ItemRenderer, Panel, Screen, Text, useExit, useSetScreen, type JSX } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';
import { ItemStack } from '@minecraft/server';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import itemAuxMap from '../../data/itemAuxMap.generated.json';

/**
 * FixedScreen demo — a single, non-scrolling page. Because nothing scrolls,
 * ItemRenderer slots stay aligned with the surrounding buttons/labels.
 * Contrast with the default scroll form.
 */
function FixedContent(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8} background={'textures/ui/recipe_book_group_expanded'}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§b§lFixed Screen'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>

      <Text>{'§7Non-scrolling layout — items render inline with controls:'}</Text>

      <Panel flexDirection={'row'} gap={4}>
        <ItemRenderer item={new ItemStack(MinecraftItemTypes.DiamondSword, 1)} />
        <ItemRenderer item={new ItemStack(MinecraftItemTypes.GoldenApple, 3)} />
        <ItemRenderer item={new ItemStack(MinecraftItemTypes.BoneBlock, 64)} />
        <ItemRenderer item={new ItemStack(MinecraftItemTypes.EnderPearl, 16)} />
      </Panel>

      <Text>{'§7Buttons and items share one fixed coordinate space:'}</Text>
      <Button>{'§aPrimary Action'}</Button>
      <Button variant={'secondary'}>{'§bSecondary Action'}</Button>
    </Panel>
  );
}

export function FixedDemo(): JSX.Element {
  // The screen declares its own layout — not the navigator's job.
  useSetScreen(Screen.Fixed);

  return (
    <ItemAuxContext value={itemAuxMap}>
      <FixedContent />
    </ItemAuxContext>
  );
}
