import { Form, theme } from '@bedrock-core/ore-styled';
import { Background, Image, Panel, Text, usePlayer, type FormValues, type JSX } from '@bedrock-core/ui';

/**
 * The UnstyledForm's twin, rendered through the ore-styled `Form` layer: same
 * fields and result keys, but every surface (toggle switch, field box, slider
 * track/thumb, dropdown closed box + popup, action buttons) comes from the ore
 * theme, and every field carries a composed label (label-free primitives — the
 * captions live in this layer).
 *
 * No BackBar: a modal can't contain buttons; submit/cancel both leave the screen.
 *
 * @param back - Returns to the previous screen.
 */
export function OreStyledForm({ back }: { back: () => void }): JSX.Element {
  const player = usePlayer();

  const handleSubmit = (values: FormValues): void => {
    player.sendMessage('§a[Ore-Styled Form] submitted:');
    player.sendMessage(`§7  music: §f${String(values.music ?? false)}`);
    player.sendMessage(`§7  hints: §f${String(values.hints ?? false)}`);
    player.sendMessage(`§7  nickname: §f${String(values.nickname ?? '')}`);
    player.sendMessage(`§7  volume: §f${String(values.volume ?? 0)}`);
    player.sendMessage(`§7  mode: §f${String(values.mode ?? '')}`);
    player.sendMessage(`§7  difficulty: §f${String(values.difficulty ?? '')}`);
    player.sendMessage(`§7  mute: §f${String(values.mute ?? false)}`);
    // control matrix
    player.sendMessage(`§7  m_tog1: §f${String(values.m_tog1 ?? false)}`);
    player.sendMessage(`§7  m_tog2: §f${String(values.m_tog2 ?? false)}`);
    player.sendMessage(`§7  m_tog3: §f${String(values.m_tog3 ?? false)}`);
    player.sendMessage(`§7  m_tog4: §f${String(values.m_tog4 ?? false)}`);
    player.sendMessage(`§7  m_in1: §f${String(values.m_in1 ?? '')}`);
    player.sendMessage(`§7  m_in2: §f${String(values.m_in2 ?? '')}`);
    player.sendMessage(`§7  m_sld1: §f${String(values.m_sld1 ?? 0)}`);
    player.sendMessage(`§7  m_sld2: §f${String(values.m_sld2 ?? 0)}`);
    player.sendMessage(`§7  m_dd1: §f${String(values.m_dd1 ?? '')}`);
    player.sendMessage(`§7  m_dd2: §f${String(values.m_dd2 ?? '')}`);
    // new controls (checkbox → boolean; radio / toggle-button → selected index)
    player.sendMessage(`§7  agree: §f${String(values.agree ?? false)}`);
    player.sendMessage(`§7  news: §f${String(values.news ?? false)}`);
    player.sendMessage(`§7  team: §f${String(values.team ?? 0)}`);
    player.sendMessage(`§7  view: §f${String(values.view ?? 0)}`);

    back();
  };

  const sm = theme.tokens.spacing.sm;

  return (
    <Form
      onSubmit={handleSubmit}
      onCancel={back}
    >
      {/* Full-screen backdrop test: rides the title's fixed 2573 slot, drawn behind everything. */}
      <Background texture={'textures/ui/dialog_background_hollow_4_thin'} />

      {/* --- new controls: checkbox (boolean toggle skin), radio group + toggle-button
          group (single-select over the native dropdown slot, return selected index). --- */}
      <Panel flexDirection={'column'} gap={sm} padding={sm}>
        <Text>{'§e§lNew controls'}</Text>

        {/* Checkboxes: box-left / caption-right, boolean value. */}
        <Form.Checkbox label={'I agree to the terms'} name={'agree'} defaultValue={false} />
        <Form.Checkbox label={'Subscribe to news'} name={'news'} defaultValue={true} />
        <Form.Checkbox label={'Locked checkbox'} name={'cb_locked'} enabled={false} />

        {/* Radio group + toggle-button group, side by side (both single-select). Options are now
            flex-laid-out Form.Option children under the hood → full per-option layout control. */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'flex-start'}>
          <Form.Radio
            label={'Team'}
            name={'team'}
            options={[{ value: 'red', label: 'Red' }, { value: 'blue', label: 'Blue' }, { value: 'green', label: 'Green' }]}
            defaultValue={'blue'}
            flex={1}
          />
          <Form.ToggleButton
            label={'View'}
            name={'view'}
            options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }, { value: 'compact', label: 'Compact' }]}
            defaultValue={'grid'}
            flex={1}
          />
        </Panel>
      </Panel>
      <Panel flexDirection={'column'} gap={2} padding={sm}>
        <Text font={'minecraftTen'} scale={1.5}>{'Ore-Styled Form'}</Text>
        <Text>{'§7Same modal as the unstyled twin, dressed by the ore theme.'}</Text>
      </Panel>
      <Panel flexDirection={'column'} gap={sm} padding={sm}>
        <Text>{'§e§lChoices'}</Text>
        <Form.Dropdown
          label={'Mode'}
          name={'mode'}
          options={['Easy', 'Normal', 'Hard']}
          defaultValue={'Normal'}
        />
        <Form.Toggle label={'Music'} name={'music'} defaultValue={true} />
        <Form.Toggle label={'Show hints'} name={'hints'} defaultValue={false} />
        <Form.Toggle label={'Locked option'} name={'locked'} enabled={false} />
      </Panel>
      <Panel flexDirection={'column'} gap={sm} padding={sm}>
        <Text>{'§e§lDetails'}</Text>
        <Form.Input label={'Nickname'} name={'nickname'} placeholder={'§7type here'} />
        <Form.Slider label={'Volume'} name={'volume'} min={0} max={10} defaultValue={5} />
        {/* Long list: exercises the popup height cap + scrollbar with ore skins.
            OFFSET VERIFICATION: currentInsetX 48 = default 8 + 40 → this closed-box
            value should sit OBVIOUSLY ~40px right of the Mode dropdown's. */}
        <Form.Dropdown
          label={'Difficulty'}
          name={'difficulty'}
          options={['Easy', 'Normal', 'Hard', 'Expert', 'Insane', 'Nightmare', 'Ultra', 'Custom']}
          defaultValue={'Normal'}
          currentInsetX={48}
        />
      </Panel>
      {/* --- responsiveness test: multi-element rows + flex + decorative-beside-native --- */}
      <Panel flexDirection={'column'} gap={sm} padding={sm}>
        <Text>{'§e§lResponsiveness'}</Text>

        {/* Multiple decorative elements in one row. */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'center'}>
          <Text>{'§7left'}</Text>
          <Image width={16} height={16} />
          <Text>{'§7right'}</Text>
        </Panel>

        {/* Flex distribution 1 : 2 in a row. */}
        <Panel flexDirection={'row'} gap={sm}>
          <Panel flex={1}><Text>{'§7flex 1'}</Text></Panel>
          <Panel flex={2}><Text>{'§7flex 2'}</Text></Panel>
        </Panel>

        {/* Decorative element beside a native control in the SAME row: does the native
            control share the row or force its own? */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'center'}>
          <Text>{'§7Mute'}</Text>
          <Form.Toggle name={'mute'} defaultValue={false} />
        </Panel>
      </Panel>

      {/* --- control matrix: every ore control packed into multi-column rows to see how
          the labeled variants behave side-by-side in-game. --- */}
      <Panel flexDirection={'column'} gap={sm} padding={sm}>
        <Text>{'§e§lControl matrix'}</Text>

        {/* Two unlabeled toggles in one row. */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'center'}>
          <Form.Toggle name={'m_tog1'} defaultValue={true} />
          <Form.Toggle name={'m_tog2'} defaultValue={false} />
        </Panel>

        {/* Two LABELED toggles in one row (labeledColumn wraps each). */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'flex-start'}>
          <Form.Toggle label={'A'} name={'m_tog3'} defaultValue={true} flex={1} />
          <Form.Toggle label={'B'} name={'m_tog4'} defaultValue={false} flex={1} />
        </Panel>

        {/* Two labeled inputs side by side, flex 1 : 1. */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'flex-start'}>
          <Form.Input label={'First'} name={'m_in1'} placeholder={'§7first'} flex={1} />
          <Form.Input label={'Second'} name={'m_in2'} placeholder={'§7second'} flex={1} />
        </Panel>

        {/* Two labeled sliders side by side. */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'flex-start'}>
          <Form.Slider label={'Low'} name={'m_sld1'} min={0} max={10} defaultValue={3} flex={1} />
          <Form.Slider label={'High'} name={'m_sld2'} min={0} max={100} defaultValue={50} flex={1} />
        </Panel>

        {/* Two labeled dropdowns in one row (the closed-box overlay under test). */}
        <Panel flexDirection={'row'} gap={sm} alignItems={'flex-start'}>
          <Form.Dropdown label={'Set 1'} name={'m_dd1'} options={['One', 'Two', 'Three']} defaultValue={'Two'} flex={1} />
          <Form.Dropdown label={'Set 2'} name={'m_dd2'} options={['X', 'Y', 'Z']} defaultValue={'Y'} flex={1} />
        </Panel>
      </Panel>

      <Panel flexDirection={'row'} gap={sm} padding={sm}>
        <Form.Button type={'submit'} label={'Save'} flex={2} />
        <Form.Button type={'exit'} label={'Cancel'} variant={'danger'} flex={1} />
      </Panel>
    </Form>
  );
}
