import {
  Button,
  Card,
  Checkbox,
  Divider,
  FONT_COLOR,
  Radio,
  RadioGroup,
  SPACING,
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
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Button'}</SectionLabel>
      <Panel flexDirection={'row'} gap={SPACING.sm}>
        <Fragment>
          <Button>
            <Text>{`${FONT_COLOR.default}Primary`}</Text>
          </Button>
          <Button variant={'secondary'}>
            <Text>{`${FONT_COLOR.default}Secondary`}</Text>
          </Button>
          <Button variant={'danger'}>
            <Text>{`${FONT_COLOR.danger}Danger`}</Text>
          </Button>
          <Button variant={'contrast'}>
            <Text>{`${FONT_COLOR.muted}Contrast`}</Text>
          </Button>
          <Button variant={'realm'}>
            <Text>{`${FONT_COLOR.default}Realm`}</Text>
          </Button>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={SPACING.sm}>
        <Fragment>
          <Button enabled={false}>
            <Text>{`${FONT_COLOR.disabled}Primary`}</Text>
          </Button>
          <Button variant={'secondary'} enabled={false}>
            <Text>{`${FONT_COLOR.disabled}Secondary`}</Text>
          </Button>
          <Button variant={'danger'} enabled={false}>
            <Text>{`${FONT_COLOR.disabled}Danger`}</Text>
          </Button>
          <Button variant={'contrast'} enabled={false}>
            <Text>{`${FONT_COLOR.disabled}Contrast`}</Text>
          </Button>
          <Button variant={'realm'} enabled={false}>
            <Text>{`${FONT_COLOR.disabled}Realm`}</Text>
          </Button>
        </Fragment>
      </Panel>
    </Panel>
  );
}

function CheckboxSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
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
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Toggle'}</SectionLabel>
      <Panel flexDirection={'row'} gap={SPACING.md} alignItems={'center'}>
        <Fragment>
          <Toggle defaultOn={false} />
          <Text>{`${FONT_COLOR.muted}default off`}</Text>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={SPACING.md} alignItems={'center'}>
        <Fragment>
          <Toggle defaultOn={true} />
          <Text>{`${FONT_COLOR.muted}default on`}</Text>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={SPACING.md} alignItems={'center'}>
        <Fragment>
          <Toggle disabled />
          <Text>{`${FONT_COLOR.muted}disabled off`}</Text>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={SPACING.md} alignItems={'center'}>
        <Fragment>
          <Toggle defaultOn={true} disabled />
          <Text>{`${FONT_COLOR.muted}disabled on`}</Text>
        </Fragment>
      </Panel>
    </Panel>
  );
}

function RadioSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
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
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'ToggleButtonGroup'}</SectionLabel>
      <ToggleButtonGroup defaultValue={'a'}>
        <ToggleButtonItem value={'a'}>
          <Text>{`${FONT_COLOR.default}Option A`}</Text>
        </ToggleButtonItem>
        <ToggleButtonItem value={'b'}>
          <Text>{`${FONT_COLOR.default}Option B`}</Text>
        </ToggleButtonItem>
        <ToggleButtonItem value={'c'}>
          <Text>{`${FONT_COLOR.default}Option C`}</Text>
        </ToggleButtonItem>
        <ToggleButtonItem value={'d'}>
          <Text>{`${FONT_COLOR.default}Option D`}</Text>
        </ToggleButtonItem>
        <ToggleButtonItem value={'e'}>
          <Text>{`${FONT_COLOR.default}Option E`}</Text>
        </ToggleButtonItem>
      </ToggleButtonGroup>
      <ToggleButtonGroup defaultValue={'x'} disabled>
        <ToggleButtonItem value={'x'}>
          <Text>{`${FONT_COLOR.muted}Disabled selected`}</Text>
        </ToggleButtonItem>
        <ToggleButtonItem value={'y'}>
          <Text>{`${FONT_COLOR.muted}Disabled`}</Text>
        </ToggleButtonItem>
      </ToggleButtonGroup>
    </Panel>
  );
}

function CardSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Card'}</SectionLabel>
      <Panel flexDirection={'row'} gap={SPACING.md} wrap={'wrap'}>
        <Card>
          <Text>{`${FONT_COLOR.default}Card with text child very long so it is only 1 line card`}</Text>
        </Card>
        <Card>
          <Text>{`${FONT_COLOR.default}Card with`}</Text>
          <Text>{`${FONT_COLOR.muted}multiple children`}</Text>
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
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Divider'}</SectionLabel>
      <Text>{`${FONT_COLOR.muted}default (2px)`}</Text>
      <Divider />
      <Text>{`${FONT_COLOR.muted}light (1px)`}</Text>
      <Divider variant={'light'} />
      <Text>{`${FONT_COLOR.muted}dark (1px)`}</Text>
      <Divider variant={'dark'} />
      <Text>{`${FONT_COLOR.muted}vertical variants`}</Text>
      <Panel flexDirection={'row'} gap={SPACING.sm} height={32}>
        <Text>{`${FONT_COLOR.muted}A`}</Text>
        <Divider orientation={'vertical'} />
        <Text>{`${FONT_COLOR.muted}B`}</Text>
        <Divider orientation={'vertical'} variant={'light'} />
        <Text>{`${FONT_COLOR.muted}C`}</Text>
        <Divider orientation={'vertical'} variant={'dark'} />
        <Text>{`${FONT_COLOR.muted}D`}</Text>
      </Panel>
    </Panel>
  );
}

export function OreStyledTest(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={SPACING.md} gap={SPACING.lg}>
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
