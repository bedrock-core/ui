import {
  Card,
  Checkbox,
  Divider,
  Radio,
  RadioGroup,
  theme,
  Toggle,
} from '@bedrock-core/ore-styled';
import {
  Fragment,
  JSX,
  Panel,
  Text,
  useState,
} from '@bedrock-core/ui';

export const Example = (): JSX.Element => {
  const [enabled, setEnabled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [plan, setPlan] = useState('basic');

  return (
    <Panel flexDirection={'column'} padding={theme.tokens.spacing.md} gap={theme.tokens.spacing.md}>
      <Text>{'§lOre-Styled Example'}</Text>
      <Card>
        <Text>{'Preferences'}</Text>
        <Divider />
        <Panel flexDirection={'row'} alignItems={'center'} gap={theme.tokens.spacing.md}>
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
    </Panel>
  );
};
