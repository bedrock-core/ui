import {
  Button,
  Card,
  Checkbox,
  Divider,
  Dropdown,
  Input,
  Radio,
  RadioGroup,
  Slider,
  theme,
  Toggle,
  ToggleButtonGroup,
  ToggleButtonItem,
} from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';
import { Fragment, Panel, Text, useState } from '@bedrock-core/ui';

function SectionLabel({ children }: { children: string }): JSX.Element {
  return <Text>{`§e§l${children}`}</Text>;
}

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
          <Button>{'Primary'}</Button>
          <Button variant={'secondary'}>{'Secondary'}</Button>
          <Button variant={'danger'}>{'Danger'}</Button>
          <Button variant={'contrast'}>{'Contrast'}</Button>
          <Button variant={'realm'}>{'Realm'}</Button>
          <Button variant={'transparent'}>{'Transparent'}</Button>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm}>
        <Fragment>
          <Button enabled={false}>{'Primary'}</Button>
          <Button variant={'secondary'} enabled={false}>{'Secondary'}</Button>
          <Button variant={'danger'} enabled={false}>{'Danger'}</Button>
          <Button variant={'contrast'} enabled={false}>{'Contrast'}</Button>
          <Button variant={'realm'} enabled={false}>{'Realm'}</Button>
          <Button variant={'transparent'} enabled={false}>{'Transparent'}</Button>
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
        <ToggleButtonItem value={'a'}>{'Option A'}</ToggleButtonItem>
        <ToggleButtonItem value={'b'}>{'Option B'}</ToggleButtonItem>
        <ToggleButtonItem value={'c'}>{'Option C'}</ToggleButtonItem>
        <ToggleButtonItem value={'d'}>{'Option D'}</ToggleButtonItem>
        <ToggleButtonItem value={'e'}>{'Option E'}</ToggleButtonItem>
      </ToggleButtonGroup>
      <ToggleButtonGroup defaultValue={'x'} disabled>
        <ToggleButtonItem value={'x'}>{'Disabled selected'}</ToggleButtonItem>
        <ToggleButtonItem value={'y'}>{'Disabled'}</ToggleButtonItem>
      </ToggleButtonGroup>
    </Panel>
  );
}

function InputSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Input'}</SectionLabel>
      <Input placeholder={'Enter your name'} label={'Name'} />
      <Input defaultValue={'Steve'} label={'Name'} />
      <Input defaultValue={'Locked'} enabled={false} />
    </Panel>
  );
}

function DropdownSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Dropdown'}</SectionLabel>
      <Dropdown options={['Easy', 'Normal', 'Hard']} label={'Difficulty'} />
      <Dropdown options={['Red', 'Green', 'Blue']} defaultValue={'Green'} label={'Color'} />
      <Dropdown options={['On', 'Off']} enabled={false} />
    </Panel>
  );
}

function SliderSection(): JSX.Element {
  const [volume, setVolume] = useState(50);

  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Slider'}</SectionLabel>
      <Slider min={0} max={10} defaultValue={3} label={'Size'} />
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.md} alignItems={'center'}>
        <Slider min={0} max={100} value={volume} onChange={setVolume} label={'Volume'} flex={1} />
        <Text>{`${theme.tokens.fontColor.muted}${volume}`}</Text>
      </Panel>
      <Slider min={0} max={10} defaultValue={3} enabled={false} />
    </Panel>
  );
}

function CardSection(): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={theme.tokens.spacing.sm}>
      <SectionLabel>{'Card'}</SectionLabel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm} wrap={'wrap'}>
        <Fragment>
          <Card variant={'default'}>
            <Text>{`${theme.tokens.fontColor.muted}default`}</Text>
            <Text>{`${theme.tokens.fontColor.default}Default`}</Text>
          </Card>
          <Card variant={'light'}>
            <Text>{`${theme.tokens.fontColor.muted}light`}</Text>
            <Text>{`${theme.tokens.fontColor.default}Light`}</Text>
          </Card>
          <Card variant={'dark'}>
            <Text>{`${theme.tokens.fontColor.muted}dark`}</Text>
            <Text>{`${theme.tokens.fontColor.default}Dark`}</Text>
          </Card>
        </Fragment>
      </Panel>
      <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm} wrap={'wrap'}>
        <Fragment>
          <Card variant={'raised'}>
            <Text>{`${theme.tokens.fontColor.muted}raised`}</Text>
            <Text>{`${theme.tokens.fontColor.default}Raised`}</Text>
          </Card>
          <Card variant={'raised-light'}>
            <Text>{`${theme.tokens.fontColor.muted}raised-light`}</Text>
            <Text>{`${theme.tokens.fontColor.default}Raised Light`}</Text>
          </Card>
          <Card variant={'raised-dark'}>
            <Text>{`${theme.tokens.fontColor.muted}raised-dark`}</Text>
            <Text>{`${theme.tokens.fontColor.default}Raised Dark`}</Text>
          </Card>
        </Fragment>
      </Panel>
      <Card variant={'raised'}>
        <Text>{`${theme.tokens.fontColor.default}§lNested cards`}</Text>
        <Panel flexDirection={'row'} gap={theme.tokens.spacing.sm}>
          <Fragment>
            <Card variant={'default'} flex={1}>
              <Text>{`${theme.tokens.fontColor.muted}inner default`}</Text>
            </Card>
            <Card variant={'light'} flex={1}>
              <Text>{`${theme.tokens.fontColor.muted}inner light`}</Text>
            </Card>
            <Card variant={'dark'} flex={1}>
              <Text>{`${theme.tokens.fontColor.muted}inner dark`}</Text>
            </Card>
          </Fragment>
        </Panel>
      </Card>
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

export function OreStyled(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={theme.tokens.spacing.md} gap={theme.tokens.spacing.lg} background={'textures/ui/ore-styled/card/default/background'}>
      <Text>{`§f§lore-styled component demo`}</Text>
      <ButtonsSection />
      <CheckboxSection />
      <ToggleSection />
      <RadioSection />
      <ToggleButtonSection />
      <InputSection />
      <DropdownSection />
      <SliderSection />
      <CardSection />
      <DividerSection />
    </Panel>
  );
}
