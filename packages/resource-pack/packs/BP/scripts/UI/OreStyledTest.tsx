import {
  Button,
  Card,
  Checkbox,
  FONT_COLOR,
  Radio,
  RadioGroup,
  Select,
  SPACING,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Toggle,
} from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';
import { Fragment, Panel, Text, useState } from '@bedrock-core/ui';

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }): JSX.Element {
  return <Text>{`§e§l${children}`}</Text>;
}

// ─── sections ────────────────────────────────────────────────────────────────

function ButtonsSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Button'}</SectionLabel>
      <Panel flexDirection={'row'} gap={SPACING.sm} wrap={'wrap'}>
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
      <Panel flexDirection={'row'} gap={SPACING.sm} wrap={'wrap'}>
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
          <Radio value={'e'} label={'Option E'} disabled />
        </Fragment>
      </RadioGroup>
    </Panel>
  );
}

function SelectSection(): JSX.Element {
  const [value, setValue] = useState('');

  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Select'}</SectionLabel>
      <Select
        placeholder={'Pick one...'}
        options={[
          { value: 'diamond', label: 'Diamond' },
          { value: 'iron', label: 'Iron' },
          { value: 'gold', label: 'Gold' },
          { value: 'netherite', label: 'Netherite' },
        ]}
        onChange={setValue}
      />
      <Text>{`${FONT_COLOR.muted}value: ${FONT_COLOR.default}${value || '(none)'}`}</Text>
      <Select
        placeholder={'Disabled'}
        options={[{ value: 'x', label: 'X' }]}
        disabled
      />
    </Panel>
  );
}

function TabsSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Tabs'}</SectionLabel>
      <Tabs defaultTab={'info'}>
        <Fragment>
          <TabList>
            <Fragment>
              <Tab id={'info'} label={'Info'} />
              <Tab id={'stats'} label={'Stats'} />
              <Tab id={'settings'} label={'Settings'} />
            </Fragment>
          </TabList>
          <TabPanel id={'info'}>
            <Text>{`${FONT_COLOR.default}Info panel content`}</Text>
          </TabPanel>
          <TabPanel id={'stats'}>
            <Text>{`${FONT_COLOR.default}Stats panel content`}</Text>
          </TabPanel>
          <TabPanel id={'settings'}>
            <Text>{`${FONT_COLOR.default}Settings panel content`}</Text>
          </TabPanel>
        </Fragment>
      </Tabs>
    </Panel>
  );
}

function CardSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Card'}</SectionLabel>
      <Panel flexDirection={'row'} gap={SPACING.md} wrap={'wrap'}>
        <Fragment>
          <Card title={'With image & desc'} image={'textures/items/diamond'} description={'A shiny diamond'} />
          <Card title={'Title only'} />
          <Card title={'With children'}>
            <Text>{`${FONT_COLOR.muted}child content`}</Text>
          </Card>
        </Fragment>
      </Panel>
    </Panel>
  );
}

function ConditionalSection(): JSX.Element {
  const [show, setShow] = useState(true);

  return (
    <Panel flexDirection={'column'} gap={SPACING.sm}>
      <SectionLabel>{'Conditional rendering (null children)'}</SectionLabel>
      <Button onPress={() => setShow(v => !v)}>
        <Text>{`${FONT_COLOR.default}Toggle item`}</Text>
      </Button>
      <Panel flexDirection={'row'} gap={SPACING.sm}>
        <Fragment>
          <Text>{`${FONT_COLOR.muted}Before`}</Text>
          {show ? <Text>{`${FONT_COLOR.success}Visible item`}</Text> : <></>}
          <Text>{`${FONT_COLOR.muted}After`}</Text>
        </Fragment>
      </Panel>
      <Text>{`${FONT_COLOR.muted}show=${show}  (null in mixed children array)`}</Text>
    </Panel>
  );
}

// ─── root ─────────────────────────────────────────────────────────────────────

export function OreStyledTest(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={SPACING.md} gap={SPACING.lg}>
      <Text>{`§f§lore-styled component test`}</Text>
      <ButtonsSection />
      <CheckboxSection />
      <ToggleSection />
      <RadioSection />
      <SelectSection />
      <TabsSection />
      <CardSection />
      <ConditionalSection />
    </Panel>
  );
}
