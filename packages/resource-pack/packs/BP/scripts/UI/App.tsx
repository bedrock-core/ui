import { Panel, Text, type JSX } from '@bedrock-core/ui';
import {
  Button,
  Card,
  Divider,
  theme,
} from '@bedrock-core/ore-styled';
import {
  createStackNavigator,
  NavigationContainer,
  type ScreenProps,
} from '@bedrock-core/navigation';

import { BackBar } from './components/BackBar';
import { HooksDemo } from './screens/HooksDemo';
import { FlexLayout } from './screens/FlexLayout';
import { FontMetrics } from './screens/FontMetrics';
import { OreStyled } from './screens/OreStyled';
import { FixedDemo } from './screens/FixedDemo';
import { GridTest } from './screens/GridTest';

// ─── Route map ────────────────────────────────────────────────────────────────
// The hub renders under the Scroll baseline; the Fixed demo declares its own
// screen layout via useSetScreen when navigated to.

type AppRoutes = {
  Home: undefined;
  HooksDemo: undefined;
  FlexLayout: undefined;
  FontMetrics: undefined;
  OreStyled: undefined;
  FixedDemo: undefined;
  GridTest: undefined;
};

type AppScreen<K extends keyof AppRoutes> = ScreenProps<AppRoutes, K>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { fontColor, spacing } = theme.tokens;

// ─── Home ─────────────────────────────────────────────────────────────────────

function HomeScreen({ navigation }: AppScreen<'Home'>): JSX.Element {
  return (
    <Card flexDirection={'column'} padding={12} gap={8}>
      <Panel flexDirection={'column'} gap={4}>
        <Text font={'minecraftTen'} scale={2}>{'@bedrock-core/ui — Demo Hub'}</Text>
        <Text>{`${fontColor.muted}Press a demo to open it. All screens have a Back button.`}</Text>
      </Panel>

      <Divider />

      <Button onPress={(): void => navigation.navigate('HooksDemo')}>
        {'§aHooks Demo'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('FlexLayout')}>
        {'§bFlex Layout'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('FontMetrics')}>
        {'§eFont Metrics'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('OreStyled')}>
        {'§dOre-Styled Components'}
      </Button>

      <Divider variant={'light'} />

      <Button variant={'contrast'} onPress={(): void => navigation.navigate('FixedDemo')}>
        {'§bFixed Screen'}
      </Button>
      <Button variant={'contrast'} onPress={(): void => navigation.navigate('GridTest')}>
        {'§dItem ID Grid Test'}
      </Button>
    </Card>
  );
}

// ─── Demo wrapper screens ─────────────────────────────────────────────────────

function HooksDemoScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'Hooks Demo'} />
      <HooksDemo />
    </Panel>
  );
}

function FlexLayoutScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'Flex Layout'} />
      <FlexLayout />
    </Panel>
  );
}

function FontMetricsScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'Font Metrics'} />
      <FontMetrics />
    </Panel>
  );
}

function OreStyledScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'Ore-Styled Components'} />
      <OreStyled />
    </Panel>
  );
}

// Item-capable demo renders its own layout (no BackBar — it has a Close button).
function FixedDemoScreen(): JSX.Element {
  return <FixedDemo />;
}

// Item ID grid test — also item-capable, renders its own layout.
function GridTestScreen(): JSX.Element {
  return <GridTest />;
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<AppRoutes>({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    HooksDemo: HooksDemoScreen,
    FlexLayout: FlexLayoutScreen,
    FontMetrics: FontMetricsScreen,
    OreStyled: OreStyledScreen,
    FixedDemo: FixedDemoScreen,
    GridTest: GridTestScreen,
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>
  );
}
