import { Text, type JSX } from '@bedrock-core/ui';
import {
  createStackNavigator,
  NavigationContainer,
  useNavigation,
  useRoute,
  type ScreenProps,
} from '@bedrock-core/navigation';
import {
  Button,
  Card,
  Divider,
  ToggleButtonGroup,
  ToggleButtonItem,
  theme,
} from '@bedrock-core/ore-styled';

// ─── Route map ────────────────────────────────────────────────────────────────

type NavTestRoutes = {
  Home: undefined; // no params
  OreDetail: { oreName: string; rarity: 'common' | 'rare' | 'legendary' }; // required params
  MineInfo: { depth: number; biome?: string }; // mixed: required + optional prop
  Settings: { tab?: 'sound' | 'display' | 'controls' } | undefined; // optional route
};

type NavScreen<K extends keyof NavTestRoutes> = ScreenProps<NavTestRoutes, K>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { fontColor } = theme.tokens;

// ─── Nested hook consumers ────────────────────────────────────────────────────

/**
 * Reusable back button — reads navigation from context via hook.
 * Receives no props; works inside any screen rendered by this navigator.
 */
function NavBackButton(): JSX.Element {
  const navigation = useNavigation<NavTestRoutes>();

  return (
    <Button variant={'danger'} onPress={(): void => navigation.goBack()} enabled={navigation.canGoBack()}>
      {`Go Back`}
    </Button>
  );
}

/**
 * Reads OreDetail params from context via hook — no prop drilling.
 * Only valid when rendered inside OreDetailScreen.
 */
function OreRarityDetails(): JSX.Element {
  const route = useRoute<NavTestRoutes, 'OreDetail'>();
  const { oreName, rarity } = route.params;

  const rarityColor = rarity === 'legendary' ? '§6' : rarity === 'rare' ? '§b' : fontColor.muted;

  return (
    <Card flexDirection={'column'} gap={4}>
      <Text>{`${fontColor.disabled}via useRoute hook (no props drilled):`}</Text>
      <Text>{`${fontColor.muted}Name:   ${rarityColor}${oreName}`}</Text>
      <Text>{`${fontColor.muted}Rarity: ${rarityColor}${rarity}`}</Text>
      <Text>{`${fontColor.disabled}key: ${route.key}`}</Text>
    </Card>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function HomeScreen({ navigation }: NavScreen<'Home'>): JSX.Element {
  return (
    <Card flexDirection={'column'} padding={12} gap={8}>
      <Text>{`${fontColor.default}§lOre Navigator`}</Text>
      <Text>{`${fontColor.muted}Covers all four route param shapes.`}</Text>

      <Divider />

      <Text>{`${fontColor.muted}Required params`}</Text>
      <Button onPress={(): void => navigation.navigate('OreDetail', { oreName: 'Diamond', rarity: 'rare' })}>
        {`${fontColor.default}Diamond Ore`}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('OreDetail', { oreName: 'Iron', rarity: 'common' })}>
        {`${fontColor.muted}Iron Ore`}
      </Button>
      <Button variant={'contrast'} onPress={(): void => navigation.navigate('OreDetail', { oreName: 'Netherite', rarity: 'legendary' })}>
        {`§6Netherite Scrap`}
      </Button>

      <Divider variant={'light'} />

      <Text>{`${fontColor.muted}Mixed params (depth required, biome optional)`}</Text>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('MineInfo', { depth: 64 })}>
        {`Mine y=64`}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('MineInfo', { depth: -40, biome: 'deep_dark' })}>
        {`Mine y=-40 — deep_dark`}
      </Button>

      <Divider variant={'light'} />

      <Text>{`${fontColor.muted}Optional route (params or no params)`}</Text>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('Settings')}>
        {`Settings`}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('Settings', { tab: 'sound' })}>
        {`Settings -> Sound`}
      </Button>
    </Card>
  );
}

function OreDetailScreen({ navigation }: NavScreen<'OreDetail'>): JSX.Element {
  return (
    <Card flexDirection={'column'} padding={12} gap={8}>
      <Text>{`${fontColor.default}§lOre Detail`}</Text>

      <Divider />

      {/* params rendered by a nested component via useRoute — no props passed */}
      <OreRarityDetails />

      <Divider variant={'light'} />

      {/* push — always a new stack entry */}
      <Button onPress={(): void => navigation.push('OreDetail', { oreName: 'Netherite', rarity: 'legendary' })}>
        {`Push Netherite`}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('MineInfo', { depth: 16, biome: 'mountains' })}>
        {`Mine Info (mountains)`}
      </Button>
      <NavBackButton />
    </Card>
  );
}

function MineInfoScreen({ navigation, route }: NavScreen<'MineInfo'>): JSX.Element {
  const { depth, biome } = route.params;

  return (
    <Card flexDirection={'column'} padding={12} gap={8}>
      <Text>{`${fontColor.default}§lMine Info`}</Text>

      <Divider />

      <Text>{`${fontColor.muted}Depth: ${fontColor.default}${depth}`}</Text>
      <Text>
        {biome != null
          ? `${fontColor.muted}Biome: ${fontColor.success}${biome}`
          : `${fontColor.disabled}No biome specified`}
      </Text>

      <Divider variant={'light'} />

      {/* setParams — merge into this screen's params without re-mounting */}
      <Button variant={'secondary'} onPress={(): void => navigation.setParams('MineInfo', { biome: 'nether_wastes' })}>
        {`Set biome -> nether_wastes`}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.setParams('MineInfo', { depth: -60 })}>
        {`Set depth -> -60`}
      </Button>
      <NavBackButton />
    </Card>
  );
}

function SettingsScreen({ navigation, route }: NavScreen<'Settings'>): JSX.Element {
  const tab = route.params?.tab ?? 'display';

  return (
    <Card flexDirection={'column'} padding={12} gap={8}>
      <Text>{`${fontColor.default}§lSettings`}</Text>
      <Text>{`${fontColor.muted}canGoBack: ${fontColor.default}${navigation.canGoBack()}`}</Text>

      <Divider />

      {/* ToggleButtonGroup maps directly to the optional tab param */}
      <ToggleButtonGroup
        value={tab}
        onChange={(value): void => {
          // controlled cast
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          navigation.navigate('Settings', { tab: value as 'sound' | 'display' | 'controls' });
        }}
      >
        <ToggleButtonItem value={'sound'}>{`Sound`}</ToggleButtonItem>
        <ToggleButtonItem value={'display'}>{`Display`}</ToggleButtonItem>
        <ToggleButtonItem value={'controls'}>{`Controls`}</ToggleButtonItem>
      </ToggleButtonGroup>

      <Divider variant={'light'} />

      {/* reset — replace the entire stack */}
      <Button variant={'secondary'} onPress={(): void => navigation.reset({ routes: [{ name: 'Home' }], index: 0 })}>
        {`Reset to Home`}
      </Button>
      <NavBackButton />
    </Card>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<NavTestRoutes>({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    OreDetail: OreDetailScreen,
    MineInfo: MineInfoScreen,
    Settings: { screen: SettingsScreen, initialParams: { tab: 'display' } },
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export function NavigationTest(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>
  );
}
