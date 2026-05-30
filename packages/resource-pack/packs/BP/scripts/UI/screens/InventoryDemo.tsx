import { ItemAuxContext, ItemRenderer, Panel, Screen, TabButton, Text, useExit, useSetScreen, type JSX } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';
import { createTabNavigator } from '@bedrock-core/navigation';
import { ItemStack } from '@minecraft/server';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import itemAuxMap from '../../data/itemAuxMap.generated.json';

type InventoryRoutes = {
  Weapons: undefined;
  Blocks: undefined;
  Info: undefined;
};

function WeaponsTab(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§c§lWeapons'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>
      <Text>{'§7Click an item to interact:'}</Text>
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.DiamondSword, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.NetheriteAxe, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Bow, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Crossbow, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Trident, 1)} />
    </Panel>
  );
}

function BlocksTab(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§a§lBlocks'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>
      <Text>{'§7Building materials:'}</Text>
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Stone, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.OakPlanks, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Cobblestone, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Glass, 1)} />
      <ItemRenderer item={new ItemStack(MinecraftItemTypes.Obsidian, 1)} />
    </Panel>
  );
}

function InfoTab(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§e§lInfo'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>
      <Text>{'§7This tab has no items — only scroll content.'}</Text>
      <Text>{'§fInventory Screen demo:'}</Text>
      <Text>{'§7• Tab bar is supplied by the consumer (tabBar prop)'}</Text>
      <Text>{'§7• Navigator owns active-tab state'}</Text>
      <Text>{'§7• Tab switching rerenders via navigation'}</Text>
      <Button>{'§aSome Action'}</Button>
      <Button variant={'secondary'}>{'§bAnother Action'}</Button>
    </Panel>
  );
}

const Tabs = createTabNavigator<InventoryRoutes>({
  initialRouteName: 'Weapons',
  screens: {
    Weapons: WeaponsTab,
    Blocks: BlocksTab,
    Info: InfoTab,
  },
  // No default tab bar — the consumer renders it from the live tab state.
  tabBar: ({ state, navigation }) => (
    <Panel flexDirection={'row'} height={20}>
      {state.routeNames.map((name, i) => (
        <TabButton
          label={name}
          active={i === state.index}
          flexGrow={1}
          onPress={(): void => { navigation.navigate(name); }}
        />
      ))}
    </Panel>
  ),
});

export function InventoryDemo(): JSX.Element {
  // The screen declares its own layout — not the navigator's job.
  useSetScreen(Screen.Inventory);

  return (
    <ItemAuxContext value={itemAuxMap}>
      <Tabs.Navigator />
    </ItemAuxContext>
  );
}
