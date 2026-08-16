/** @jsxImportSource @bedrock-core/ui-runtime */
import guidesManifest from '@bedrock-core/generated/guides';
import { Panel, Text, useExit, type JSX } from '@bedrock-core/ui';
import {
  Button,
  Card,
  Divider,
  theme,
} from '@bedrock-core/ore-styled';
import { createGuide } from '@bedrock-core/guides';
import {
  createStackNavigator,
  NavigationContainer,
  type ScreenProps,
} from '@bedrock-core/navigation';

import { BackBar } from './components/BackBar';
import { GuideDemoButton } from './components/GuideDemoButton';
// Imported for its side effect too: creating the addon's i18n instance is what
// registers the default translation source Text measures localized children with.
import './i18n';
import { HooksDemo } from './screens/HooksDemo';
import { I18nDemo } from './screens/I18nDemo';
import { FlexLayout } from './screens/FlexLayout';
import { FontMetrics } from './screens/FontMetrics';
import { FormDemo } from './screens/FormDemo';
import { OreStyled } from './screens/OreStyled';
import { ScrollDemo } from './screens/ScrollDemo';
import { DualScrollDemo } from './screens/DualScrollDemo';
import { FixedHeaderScrollDemo } from './screens/FixedHeaderScrollDemo';
import { StressDemo, StressDemoFlat } from './screens/StressDemo';
import { UnstyledPrimitives } from './screens/UnstyledPrimitives';
import { UnstyledForm } from './screens/UnstyledForm';
import { OreStyledForm } from './screens/OreStyledForm';

// ─── Route map ────────────────────────────────────────────────────────────────

type AppRoutes = {
  Home: undefined;
  HooksDemo: undefined;
  I18nDemo: undefined;
  FlexLayout: undefined;
  FontMetrics: undefined;
  FormDemo: undefined;
  UnstyledPrimitives: undefined;
  UnstyledForm: undefined;
  OreStyledForm: undefined;
  OreStyled: undefined;
  ScrollDemo: undefined;
  DualScrollDemo: undefined;
  FixedHeaderScrollDemo: undefined;
  StressDemo: undefined;
  StressDemoFlat: undefined;
  Guide: undefined;
};

type AppScreen<K extends keyof AppRoutes> = ScreenProps<AppRoutes, K>;

// MDX guide demo — content compiled from packs/data/guides/** by the guides filter.
// Built once so its open-page state survives re-renders (see createGuide).
const DemoGuide = createGuide(guidesManifest, {
  title: 'Guide Demo',
  components: { GuideDemoButton },
});

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
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('I18nDemo')}>
        {'§ai18n Demo'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('FlexLayout')}>
        {'§bFlex Layout'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('FontMetrics')}>
        {'§eFont Metrics'}
      </Button>

      <Divider />

      <Button variant={'secondary'} onPress={(): void => navigation.navigate('UnstyledPrimitives')}>
        {'§fUnstyled Primitives'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('OreStyled')}>
        {'§dOre-Styled Components'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('UnstyledForm')}>
        {'§fUnstyled Form'}
      </Button>
      <Button variant={'secondary'} onPress={(): void => navigation.navigate('OreStyledForm')}>
        {'§dOre-Styled Form'}
      </Button>

      <Divider />

      <Button variant={'secondary'} onPress={(): void => navigation.navigate('FormDemo')}>
        {'§6Form Inputs'}
      </Button>

      <Divider />

      <Button variant={'secondary'} onPress={(): void => navigation.navigate('Guide')}>
        {'§dGuide Demo (MDX)'}
      </Button>

      <Divider variant={'light'} />

      <Button variant={'contrast'} onPress={(): void => navigation.navigate('ScrollDemo')}>
        {'§bScroll Screen + Items'}
      </Button>
      <Button variant={'contrast'} onPress={(): void => navigation.navigate('DualScrollDemo')}>
        {'§dDual Scroll Screen'}
      </Button>
      <Button variant={'contrast'} onPress={(): void => navigation.navigate('FixedHeaderScrollDemo')}>
        {'§6Fixed Header + Scroll'}
      </Button>

      <Divider />

      <Button variant={'contrast'} onPress={(): void => navigation.navigate('StressDemo')}>
        {'§cStress (2 scrolls)'}
      </Button>
      <Button variant={'contrast'} onPress={(): void => navigation.navigate('StressDemoFlat')}>
        {'§cStress (no scrolls)'}
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

function I18nDemoScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'i18n Demo'} />
      <I18nDemo />
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

function UnstyledPrimitivesScreen(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.sm}>
      <BackBar title={'Unstyled Primitives'} />
      <UnstyledPrimitives />
    </Panel>
  );
}

// Native modal form — renders a <Form> directly. The navigator only renders the
// active screen and everything above it (container/navigator) is a transparent
// context-provider, so the rendered tree is a clean modal tree (no stray buttons).
// No BackBar wrapper: a modal can't contain buttons; submit/cancel call exit().
function UnstyledFormScreen(): JSX.Element {
  const exit = useExit();

  return <UnstyledForm back={(): void => exit()} />;
}

function OreStyledFormScreen(): JSX.Element {
  const exit = useExit();

  return <OreStyledForm back={(): void => exit()} />;
}

// Scrolling item demo — renders its own scroll layout with a Close button.
function ScrollDemoScreen(): JSX.Element {
  return <ScrollDemo />;
}

// Dual-scroll demo — renders its own two-region layout directly (no concrete wrapper
// above the slots, so the region-aware layout pass can reach them).
function DualScrollDemoScreen(): JSX.Element {
  return <DualScrollDemo />;
}

// Region demos — each renders its own multi-region layout directly.
function FixedHeaderScrollDemoScreen(): JSX.Element {
  return <FixedHeaderScrollDemo />;
}

// Perf benchmark screens — deterministic payloads, see StressDemo.tsx.
function StressDemoScreen(): JSX.Element {
  return <StressDemo />;
}

function StressDemoFlatScreen(): JSX.Element {
  return <StressDemoFlat />;
}

// The guide drives its own home ⇆ page navigation; `onExit` pops back to the demo hub.
function GuideScreen({ navigation }: AppScreen<'Guide'>): JSX.Element {
  return <DemoGuide onExit={(): void => navigation.goBack()} />;
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<AppRoutes>({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    HooksDemo: HooksDemoScreen,
    I18nDemo: I18nDemoScreen,
    FlexLayout: FlexLayoutScreen,
    FontMetrics: FontMetricsScreen,
    FormDemo: FormDemoScreen,
    UnstyledPrimitives: UnstyledPrimitivesScreen,
    UnstyledForm: UnstyledFormScreen,
    OreStyledForm: OreStyledFormScreen,
    OreStyled: OreStyledScreen,
    ScrollDemo: ScrollDemoScreen,
    DualScrollDemo: DualScrollDemoScreen,
    FixedHeaderScrollDemo: FixedHeaderScrollDemoScreen,
    StressDemo: StressDemoScreen,
    StressDemoFlat: StressDemoFlatScreen,
    Guide: GuideScreen,
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

// No translation wiring here — creating the i18n instance (./i18n) registered
// the default source, and localized-text measurement resolves through it.
export function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>
  );
}
