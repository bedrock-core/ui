import translationKeys from '@bedrock-core/generated/translation-keys';
import { Panel, Text, TranslationKeysContext, type JSX } from '@bedrock-core/ui';
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
import { FormDemo } from './screens/FormDemo';
import { OreStyled } from './screens/OreStyled';
import { ScrollDemo } from './screens/ScrollDemo';

// ─── Route map ────────────────────────────────────────────────────────────────

type AppRoutes = {
  Home: undefined;
  HooksDemo: undefined;
  FlexLayout: undefined;
  FontMetrics: undefined;
  FormDemo: undefined;
  OreStyled: undefined;
  ScrollDemo: undefined;
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
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('FormDemo')}>
        {'§6Form Inputs'}
      </Button>

      <Divider variant={'light'} />

      <Button variant={'contrast'} onPress={(): void => navigation.navigate('ScrollDemo')}>
        {'§bScroll Screen + Items'}
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

function FormDemoScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'Form Inputs'} />
      <FormDemo />
    </Panel>
  );
}

// Scrolling item demo — renders its own scroll layout with a Close button.
function ScrollDemoScreen(): JSX.Element {
  return <ScrollDemo />;
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<AppRoutes>({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    HooksDemo: HooksDemoScreen,
    FlexLayout: FlexLayoutScreen,
    FontMetrics: FontMetricsScreen,
    FormDemo: FormDemoScreen,
    OreStyled: OreStyledScreen,
    ScrollDemo: ScrollDemoScreen,
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export function App(): JSX.Element {
  return (
    <TranslationKeysContext value={translationKeys}>
      <NavigationContainer>
        <Stack.Navigator />
      </NavigationContainer>
    </TranslationKeysContext>
  );
}
