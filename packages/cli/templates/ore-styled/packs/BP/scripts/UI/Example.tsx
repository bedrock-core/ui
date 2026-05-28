import {
  NavigationContainer,
  createStackNavigator,
  type ScreenProps,
} from '@bedrock-core/navigation';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Radio,
  RadioGroup,
  theme,
  Toggle,
} from '@bedrock-core/ore-styled';
import { Fragment, type JSX, Panel, Text, useState } from '@bedrock-core/ui';

// ─── Route map ────────────────────────────────────────────────────────────────

type AppRoutes = {
  Home: undefined;
  Settings: { plan: string };
};

type Screen<K extends keyof AppRoutes> = ScreenProps<AppRoutes, K>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { fontColor, spacing } = theme.tokens;

// ─── Screens ──────────────────────────────────────────────────────────────────

function HomeScreen({ navigation }: Screen<'Home'>): JSX.Element {
  const [enabled, setEnabled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [plan, setPlan] = useState('basic');

  return (
    <Panel flexDirection={'column'} padding={spacing.md} gap={spacing.md}>
      <Text>{'§lOre-Styled Example'}</Text>

      <Card>
        <Text>{'Preferences'}</Text>
        <Divider />
        <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.md}>
          <Fragment>
            <Toggle on={enabled} onChange={setEnabled} />
            <Text>{`Auto-save: ${enabled ? '§aON' : '§cOFF'}`}</Text>
          </Fragment>
        </Panel>
        <Checkbox label={'I agree to the terms'} checked={accepted} onChange={setAccepted} />
      </Card>

      <Card>
        <Text>{'Choose a plan'}</Text>
        <Divider />
        <RadioGroup value={plan} onChange={setPlan}>
          <Fragment>
            <Radio value={'basic'} label={'Basic'} />
            <Radio value={'pro'} label={'Pro'} />
            <Radio value={'team'} label={'Team'} disabled />
          </Fragment>
        </RadioGroup>
      </Card>

      <Button onPress={(): void => navigation.navigate('Settings', { plan })}>
        {`${fontColor.default}Go to Settings →`}
      </Button>
    </Panel>
  );
}

function SettingsScreen({ navigation, route }: Screen<'Settings'>): JSX.Element {
  const { plan } = route.params;

  return (
    <Panel flexDirection={'column'} padding={spacing.md} gap={spacing.md}>
      <Text>{'§lSettings'}</Text>

      <Card>
        <Text>{`${fontColor.muted}Selected plan: ${fontColor.default}§l${plan}`}</Text>
        <Divider />
        <Text>{`${fontColor.disabled}Manage your account settings here.`}</Text>
      </Card>

      <Button variant={'secondary'} onPress={(): void => navigation.goBack()}>
        {`${fontColor.default}<- Go Back`}
      </Button>
    </Panel>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────

const Stack = createStackNavigator<AppRoutes>({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export function Example(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>
  );
}
