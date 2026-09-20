/** @jsxImportSource @bedrock-core/ui */
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Radio,
  theme,
  Toggle,
} from '@bedrock-core/ui/ore-styled';
import { Fragment, type JSX, Panel, Screen, Text, usePlayer, useState, useTranslation } from '@bedrock-core/ui';
import { useNavigation } from '@bedrock-core/ui/navigation';
import { i18n } from '../i18n';

const { fontColor, spacing } = theme.tokens;

/**
 * The addon's home screen, opened by `render()` in main.ts on a button push.
 * Compiled as `{{CREATOR_ID}}_{{PACK_ID}}:home` — navigated to by that key from
 * anywhere else in this addon.
 */
export default function Home(): JSX.Element {
  const player = usePlayer();
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [plan, setPlan] = useState('basic');

  // The typed verbs, bound to this player's language (../i18n.ts).
  const { t, key } = useTranslation(i18n);

  return (
    <Screen>
      <Panel flexDirection={'column'} padding={spacing.md} gap={spacing.md}>
        {/* A key() string as a child is auto-detected and resolved CLIENT-side. */}
        <Text>{key($ => $.meta.name)}</Text>
        {/* t() resolves + fills server-side in this player's language. */}
        <Text>{`${fontColor.muted}${t($ => $.example.greeting, { name: player.name })}`}</Text>

        <Card>
          <Text>{'Preferences'}</Text>
          <Divider />
          <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.md}>
            <Fragment>
              <Toggle on={enabled} onChange={setEnabled} />
              {/* State-driven text needs maxLength to reserve room for its longest value. */}
              <Text maxLength={20}>{`Auto-save: ${enabled ? '§aON' : '§cOFF'}`}</Text>
            </Fragment>
          </Panel>
          <Checkbox label={'I agree to the terms'} on={accepted} onChange={setAccepted} />
        </Card>

        <Card>
          <Text>{'Choose a plan'}</Text>
          <Divider />
          <Radio
            value={plan}
            onChange={setPlan}
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'pro', label: 'Pro' },
              { value: 'team', label: 'Team' },
            ]}
          />
        </Card>

        {/* A live value (plan) rides along as a param, so this press calls navigate() directly. */}
        <Button
          onPress={(): void => {
            navigation.navigate('{{CREATOR_ID}}_{{PACK_ID}}:plan', { params: { plan } });
          }}
        >
          {`${fontColor.default}See your plan ->`}
        </Button>

        {/* No live value to carry: `to` makes this a plain compiled link, no handler needed. */}
        <Button variant={'secondary'} to={'{{CREATOR_ID}}_{{PACK_ID}}:profile_form'}>
          {`${fontColor.default}Open Profile Form ->`}
        </Button>
      </Panel>
    </Screen>
  );
}
