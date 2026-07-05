import { Form, Image, Panel, Text, usePlayer, type FormValues, type JSX } from '@bedrock-core/ui';

/**
 * Native modal-form demo with ZERO styling props: every control surface (toggle
 * faces, input box, slider track/progress/thumb, dropdown closed box, popup and
 * option rows) falls back to the unstyled placeholder texture, so this screen
 * checks the raw `<Form>` behaviour — geometry, state swaps, write-back, submit.
 *
 * A `<Form>` renders ONE atomic `ModalFormData`: every field is shown at once and
 * nothing comes back until the player presses submit, at which point all values
 * arrive together — keyed by each control's `name` — in `onSubmit`.
 *
 * No BackBar: a modal can't contain buttons; submit/cancel both leave the screen.
 *
 * @param back - Returns to the previous screen.
 */
export function UnstyledForm({ back }: { back: () => void }): JSX.Element {
  const player = usePlayer();

  const handleSubmit = (values: FormValues): void => {
    player.sendMessage('§a[Unstyled Form] submitted:');
    player.sendMessage(`§7  toggle_a: §f${String(values.toggle_a ?? false)}`);
    player.sendMessage(`§7  toggle_b: §f${String(values.toggle_b ?? false)}`);
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

    back();
  };

  return (
    <Form
      onSubmit={handleSubmit}
      onCancel={back}
    >
      {/* Decorative elements ride the modal label slot (label_router): text,
          image, and panels/cards all render; only buttons are modal-forbidden. */}
      <Panel flexDirection={'column'} gap={2} padding={4}>
        <Text font={'minecraftTen'} scale={1.5}>{'Unstyled Form'}</Text>
        <Text>{'§7Decorative text + image render via the modal label router.'}</Text>
        <Image width={24} height={24} />
      </Panel>
      <Panel flexDirection={'column'} gap={2} padding={4}>
        <Text>{'§e§lChoices'}</Text>
        {/* Options are Form.Option children (same authoring shape as Radio/ToggleButton). */}
        <Form.Dropdown name={'mode'} defaultValue={'Normal'}>
          <Form.Option value={'Easy'} label={'Easy'} />
          <Form.Option value={'Normal'} label={'Normal'} />
          <Form.Option value={'Hard'} label={'Hard'} />
        </Form.Dropdown>
        <Form.Toggle name={'toggle_a'} defaultValue={true} />
        <Form.Toggle name={'toggle_b'} defaultValue={false} />
      </Panel>
      <Panel flexDirection={'column'} gap={2} padding={4}>
        <Text>{'§e§lDetails'}</Text>
        <Form.Input name={'nickname'} placeholder={'§7type here'} />
        <Form.Slider name={'volume'} min={0} max={10} defaultValue={5} />
        {/* Long list: exercises the popup height cap + scrollbar. */}
        <Form.Dropdown name={'difficulty'} defaultValue={'Normal'}>
          {['Easy', 'Normal', 'Hard', 'Expert', 'Insane', 'Nightmare', 'Ultra', 'Custom'].map(o => (
            <Form.Option value={o} label={o} />
          ))}
        </Form.Dropdown>
      </Panel>
      {/* --- responsiveness test: multi-element rows + flex + decorative-beside-native --- */}
      <Panel flexDirection={'column'} gap={2} padding={4}>
        <Text>{'§e§lResponsiveness'}</Text>

        {/* Multiple decorative elements in one row. */}
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <Text>{'§7left'}</Text>
          <Image width={16} height={16} />
          <Text>{'§7right'}</Text>
        </Panel>

        {/* Flex distribution 1 : 2 in a row. */}
        <Panel flexDirection={'row'} gap={4}>
          <Panel flex={1}><Text>{'§7flex 1'}</Text></Panel>
          <Panel flex={2}><Text>{'§7flex 2'}</Text></Panel>
        </Panel>

        {/* Decorative element beside a native control in the SAME row: does the native
            control share the row or force its own? */}
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <Text>{'§7Mute'}</Text>
          <Form.Toggle name={'mute'} defaultValue={false} />
        </Panel>
      </Panel>

      {/* --- control matrix: every native control packed into multi-column rows to see
          how they behave side-by-side in-game (do they share a row / size / align?). --- */}
      <Panel flexDirection={'column'} gap={2} padding={4}>
        <Text>{'§e§lControl matrix'}</Text>

        {/* Two toggles in one row. */}
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <Form.Toggle name={'m_tog1'} defaultValue={true} />
          <Form.Toggle name={'m_tog2'} defaultValue={false} />
        </Panel>

        {/* Three toggles, each labeled, in one row. */}
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <Text>{'§7A'}</Text>
          <Form.Toggle name={'m_tog3'} defaultValue={true} />
          <Text>{'§7B'}</Text>
          <Form.Toggle name={'m_tog4'} defaultValue={false} />
        </Panel>

        {/* Two inputs side by side, flex 1 : 1. */}
        <Panel flexDirection={'row'} gap={4}>
          <Form.Input name={'m_in1'} placeholder={'§7first'} flex={1} />
          <Form.Input name={'m_in2'} placeholder={'§7second'} flex={1} />
        </Panel>

        {/* Two sliders side by side. */}
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <Form.Slider name={'m_sld1'} min={0} max={10} defaultValue={3} flex={1} />
          <Form.Slider name={'m_sld2'} min={0} max={100} defaultValue={50} flex={1} />
        </Panel>

        {/* Two dropdowns proving the per-option encoding is DATA-DRIVEN: left one has
            CENTER-aligned option labels, right one RIGHT-aligned. Each option carries its own
            encoded blob (text + bg + font/scale + align), decoded per-row by the RP — so the
            alignment differs per dropdown (and per option, once the override API lands). */}
        <Panel flexDirection={'row'} gap={4} alignItems={'flex-start'}>
          <Form.Dropdown name={'m_dd1'} defaultValue={'Two'} optionAlign={'center'} flex={1}>
            <Form.Option value={'One'} label={'One'} />
            <Form.Option value={'Two'} label={'Two'} />
            {/* Per-option override: this one right-aligns while the group centers. */}
            <Form.Option value={'Three'} label={'Three'} align={'right'} />
          </Form.Dropdown>
          <Form.Dropdown name={'m_dd2'} defaultValue={'Y'} optionAlign={'right'} flex={1}>
            <Form.Option value={'X'} label={'X'} />
            <Form.Option value={'Y'} label={'Y'} />
            <Form.Option value={'Z'} label={'Z'} />
          </Form.Dropdown>
        </Panel>
      </Panel>

      {/* Action buttons live IN the flow like any row: one submit (required, presses
          the native submit) and one exit (closes like Esc → onCancel). */}
      <Panel flexDirection={'row'} gap={4} padding={4}>
        <Form.Button type={'submit'} label={'Save'} flex={2} />
        <Form.Button type={'exit'} label={'Cancel'} flex={1} />
      </Panel>
    </Form>
  );
}
