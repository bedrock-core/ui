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

    back();
  };

  return (
    <Form
      submitLabel={'Save'}
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
        <Form.Dropdown
          name={'mode'}
          options={['Easy', 'Normal', 'Hard']}
          defaultValue={'Normal'}
        />
        <Form.Toggle name={'toggle_a'} defaultValue={true} />
        <Form.Toggle name={'toggle_b'} defaultValue={false} />
      </Panel>
      <Panel flexDirection={'column'} gap={2} padding={4}>
        <Text>{'§e§lDetails'}</Text>
        <Form.Input name={'nickname'} placeholder={'§7type here'} />
        <Form.Slider name={'volume'} min={0} max={10} defaultValue={5} />
        {/* Long list: exercises the popup height cap + scrollbar. */}
        <Form.Dropdown
          name={'difficulty'}
          options={['Easy', 'Normal', 'Hard', 'Expert', 'Insane', 'Nightmare', 'Ultra', 'Custom']}
          defaultValue={'Normal'}
        />
      </Panel>
    </Form>
  );
}
