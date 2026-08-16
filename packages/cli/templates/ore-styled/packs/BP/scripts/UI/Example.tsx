import { world } from '@minecraft/server';
import {
  createStackNavigator,
  NavigationContainer,
  type ScreenProps,
} from '@bedrock-core/navigation';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Radio,
  RadioGroup,
  theme,
  Toggle,
} from '@bedrock-core/ore-styled';
import { Fragment, type JSX, Panel, Text, useState } from '@bedrock-core/ui';
import './i18n';

// ─── Route map ────────────────────────────────────────────────────────────────

type AppRoutes = {
  Home: undefined;
  Settings: { plan: string };
  ProfileForm: undefined;
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

      <Button variant={'secondary'} onPress={(): void => navigation.navigate('ProfileForm')}>
        {`${fontColor.default}Open Profile Form →`}
      </Button>
    </Panel>
  );
}

// A native modal form (ModalFormData-backed): every field's value arrives once, in
// onSubmit, keyed by its `name`. Exactly one Form.Button type="submit" is required.
function ProfileFormScreen({ navigation }: Screen<'ProfileForm'>): JSX.Element {
  return (
    <Form
      onSubmit={(values): void => {
        // values.nick / values.difficulty / values.volume / values.notify
        world.sendMessage(`§aSaved profile: ${String(values.nick)}`);
        navigation.goBack();
      }}
      onCancel={(): void => navigation.goBack()}
    >
      <Text>{'§lProfile'}</Text>
      <Form.Input name={'nick'} label={'Nickname'} placeholder={'Steve'} />
      <Form.Dropdown name={'difficulty'} label={'Difficulty'} options={['Peaceful', 'Easy', 'Normal', 'Hard']} />
      <Form.Slider name={'volume'} label={'Volume'} min={0} max={10} defaultValue={7} />
      <Form.Toggle name={'notify'} label={'Notifications'} defaultValue={true} />
      <Form.Button type={'submit'} label={'Save'} />
      <Form.Button type={'exit'} label={'Cancel'} />
    </Form>
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
    ProfileForm: ProfileFormScreen,
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

// No translation wiring needed: creating the i18n instance (./i18n.ts) registers the
// default source, and <Text localizationKey={...} /> measures through it automatically.
export function Example(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>
  );
}
