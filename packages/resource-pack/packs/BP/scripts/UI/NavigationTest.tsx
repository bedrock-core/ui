import { Button, Panel, Text, type JSX } from '@bedrock-core/ui';
import {
  createStackNavigator,
  NavigationContainer,
  useRoute,
  type ScreenComponentProps,
} from '@bedrock-core/navigation';

// ─── Route map ────────────────────────────────────────────────────────────────

type NavTestRoutes = {
  Home: undefined;
  Detail: { itemName: string };
  Settings: undefined;
};

// ─── Screens ──────────────────────────────────────────────────────────────────

function HomeScreen({ navigation }: ScreenComponentProps<NavTestRoutes, 'Home'>): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={12} gap={8}>
      <Text>{`§f§lNavigation Test — Home`}</Text>
      <Text>{`§7Navigate to Detail with typed params, or go to Settings.`}</Text>

      <Button onPress={(): void => navigation.navigate('Detail', { itemName: 'Diamond Sword' })}>
        <Text>{`§aGo to Detail (Diamond Sword)`}</Text>
      </Button>

      <Button onPress={(): void => navigation.navigate('Detail', { itemName: 'Golden Apple' })}>
        <Text>{`§6Go to Detail (Golden Apple)`}</Text>
      </Button>

      <Button onPress={(): void => navigation.navigate('Settings')}>
        <Text>{`§bGo to Settings`}</Text>
      </Button>
    </Panel>
  );
}

function DetailScreen({ navigation }: ScreenComponentProps<NavTestRoutes, 'Detail'>): JSX.Element {
  const route = useRoute<NavTestRoutes, 'Detail'>();

  return (
    <Panel flexDirection={'column'} padding={12} gap={8}>
      <Text>{`§f§lNavigation Test — Detail`}</Text>
      <Text>{`§eItem: §f${route.params.itemName}`}</Text>
      <Text>{`§7Route key: §8${route.key}`}</Text>

      <Button onPress={(): void => navigation.goBack()}>
        <Text>{`§cGo Back`}</Text>
      </Button>

      <Button onPress={(): void => navigation.navigate('Settings')}>
        <Text>{`§bGo to Settings`}</Text>
      </Button>

      <Button onPress={(): void => navigation.push('Detail', { itemName: 'Netherite Axe' })}>
        <Text>{`§dPush new Detail (Netherite Axe)`}</Text>
      </Button>
    </Panel>
  );
}

function SettingsScreen({ navigation }: ScreenComponentProps<NavTestRoutes, 'Settings'>): JSX.Element {
  const canGoBack = navigation.canGoBack();

  return (
    <Panel flexDirection={'column'} padding={12} gap={8}>
      <Text>{`§f§lNavigation Test — Settings`}</Text>
      <Text>{`§7canGoBack: §f${canGoBack}`}</Text>

      <Button onPress={(): void => navigation.goBack()} enabled={canGoBack}>
        <Text>{`§cGo Back`}</Text>
      </Button>

      <Button onPress={(): void => navigation.reset({ routes: [{ name: 'Home' }], index: 0 })}>
        <Text>{`§aReset to Home`}</Text>
      </Button>
    </Panel>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<NavTestRoutes>({
  screens: {
    Home: HomeScreen,
    Detail: DetailScreen,
    Settings: SettingsScreen,
  },
  initialRouteName: 'Home',
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export function NavigationTest(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>
  );
}
