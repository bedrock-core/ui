import {
  Button,
  Card,
  Checkbox,
  Divider,
  Radio,
  RadioGroup,
  theme,
  Toggle,
  ToggleButtonGroup,
  ToggleButtonItem,
} from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';
import { Fragment, Image, Panel, Text } from '@bedrock-core/ui';

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }): JSX.Element {
  return <Text>{`§e§l${children}`}</Text>;
}

// ─── sections ────────────────────────────────────────────────────────────────

function ButtonsSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Button'}</SectionLabel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm}>
        <Fragment>
          <Button variant={'hero'} flexGrow={1}>{'Hero'}</Button>
          <Button variant={'hero'} flexGrow={1} enabled={false}>{'Hero'}</Button>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm}>
        <Fragment>
          <Button>
            {`Primary`}
          </Button>
          <Button variant={'secondary'}>
            {`Secondary`}
          </Button>
          <Button variant={'danger'}>
            {`Danger`}
          </Button>
          <Button variant={'contrast'}>
            {`Contrast`}
          </Button>
          <Button variant={'realm'}>
            {`Realm`}
          </Button>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm}>
        <Fragment>
          <Button enabled={false}>
            {`Primary`}
          </Button>
          <Button variant={'secondary'} enabled={false}>
            {`Secondary`}
          </Button>
          <Button variant={'danger'} enabled={false}>
            {`Danger`}
          </Button>
          <Button variant={'contrast'} enabled={false}>
            {`Contrast`}
          </Button>
          <Button variant={'realm'} enabled={false}>
            {`Realm`}
          </Button>
        </Fragment>
      </Panel>
    </Panel>
  );
}

function CheckboxSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Checkbox'}</SectionLabel>
      <Checkbox label={'Unchecked by default'} defaultChecked={false} />
      <Checkbox label={'Checked by default'} defaultChecked={true} />
      <Checkbox label={'Disabled unchecked'} disabled />
      <Checkbox label={'Disabled checked'} defaultChecked={true} disabled />
    </Panel>
  );
}

function ToggleSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Toggle'}</SectionLabel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.md} alignItems={'center'}>
        <Fragment>
          <Toggle defaultOn={false} />
          <Text>{`${theme.tokens.fontColor.muted}default off`}</Text>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.md} alignItems={'center'}>
        <Fragment>
          <Toggle defaultOn={true} />
          <Text>{`${theme.tokens.fontColor.muted}default on`}</Text>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.md} alignItems={'center'}>
        <Fragment>
          <Toggle disabled />
          <Text>{`${theme.tokens.fontColor.muted}disabled off`}</Text>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.md} alignItems={'center'}>
        <Fragment>
          <Toggle defaultOn={true} disabled />
          <Text>{`${theme.tokens.fontColor.muted}disabled on`}</Text>
        </Fragment>
      </Panel>
    </Panel>
  );
}

function RadioSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'RadioGroup'}</SectionLabel>
      <RadioGroup defaultValue={'a'}>
        <Fragment>
          <Radio value={'a'} label={'Option A'} />
          <Radio value={'b'} label={'Option B'} />
          <Radio value={'c'} label={'Option C'} disabled />
        </Fragment>
      </RadioGroup>
      <RadioGroup defaultValue={'d'}>
        <Fragment>
          <Radio value={'d'} label={'Option D'} />
        </Fragment>
      </RadioGroup>
      <RadioGroup defaultValue={'e'}>
        <Radio value={'e'} label={'Option E'} disabled />
      </RadioGroup>
    </Panel>
  );
}

function ToggleButtonSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'ToggleButtonGroup'}</SectionLabel>
      <ToggleButtonGroup defaultValue={'a'}>
        <ToggleButtonItem value={'a'}>
          {'Option A'}
        </ToggleButtonItem>
        <ToggleButtonItem value={'b'}>
          {'Option B'}
        </ToggleButtonItem>
        <ToggleButtonItem value={'c'}>
          {'Option C'}
        </ToggleButtonItem>
        <ToggleButtonItem value={'d'}>
          {'Option D'}
        </ToggleButtonItem>
        <ToggleButtonItem value={'e'}>
          {'Option E'}
        </ToggleButtonItem>
      </ToggleButtonGroup>
      <ToggleButtonGroup defaultValue={'x'} disabled>
        <ToggleButtonItem value={'x'}>
          {'Disabled selected'}
        </ToggleButtonItem>
        <ToggleButtonItem value={'y'}>
          {'Disabled'}
        </ToggleButtonItem>
      </ToggleButtonGroup>
    </Panel>
  );
}

function CardSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Card'}</SectionLabel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.md} wrap={'wrap'}>
        <Card>
          <Text>{`${theme.tokens.fontColor.default}Card with text child very long so it is only 1 line card`}</Text>
        </Card>
        <Card>
          <Text>{`${theme.tokens.fontColor.default}Card with`}</Text>
          <Text>{`${theme.tokens.fontColor.muted}multiple children`}</Text>
        </Card>
        <Card>
          <Image width={48} height={48} texture={'textures/ui/cartography_table_copy'} />
        </Card>
        <Card>
        </Card>
      </Panel>
    </Panel>
  );
}

function DividerSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Divider'}</SectionLabel>
      <Text>{`${theme.tokens.fontColor.muted}default (2px)`}</Text>
      <Divider />
      <Text>{`${theme.tokens.fontColor.muted}light (1px)`}</Text>
      <Divider variant={'light'} />
      <Text>{`${theme.tokens.fontColor.muted}dark (1px)`}</Text>
      <Divider variant={'dark'} />
      <Text>{`${theme.tokens.fontColor.muted}vertical variants`}</Text>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm} height={32}>
        <Text>{`${theme.tokens.fontColor.muted}A`}</Text>
        <Divider orientation={'vertical'} />
        <Text>{`${theme.tokens.fontColor.muted}B`}</Text>
        <Divider orientation={'vertical'} variant={'light'} />
        <Text>{`${theme.tokens.fontColor.muted}C`}</Text>
        <Divider orientation={'vertical'} variant={'dark'} />
        <Text>{`${theme.tokens.fontColor.muted}D`}</Text>
      </Panel>
    </Panel>
  );
}

export function OreStyledTest(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={theme.tokens.spacing.md} gap={theme.tokens.spacing.lg}>
      <Text>{`§f§lore-styled component test`}</Text>
      <ButtonsSection />
      <CheckboxSection />
      <ToggleSection />
      <RadioSection />
      <ToggleButtonSection />
      <CardSection />
      <DividerSection />
    </Panel>
  );
}
