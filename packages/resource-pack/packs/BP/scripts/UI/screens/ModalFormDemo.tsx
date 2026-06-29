import { Form, usePlayer, type FormValues, type JSX } from '@bedrock-core/ui';

const DIFFICULTIES = ['Peaceful', 'Easy', 'Normal', 'Hard'];

/**
 * Native modal-form demo, rendered as a normal navigation screen.
 *
 * A `<Form>` renders ONE atomic `ModalFormData`: every field is shown at once and
 * nothing comes back until the player presses submit, at which point all values
 * arrive together — keyed by each control's `name` — in `onSubmit`.
 *
 * This sits inside the Stack navigator just like any other screen: the navigator
 * renders only the ACTIVE screen, and everything above it (NavigationContainer,
 * Navigator) is a transparent context-provider — so when this screen is active the
 * rendered tree is a clean modal tree with no stray buttons. The restriction pass is
 * satisfied because the inactive button-driven screens aren't in the tree.
 *
 * @param back - Returns to the previous screen (`navigation.goBack`).
 */
export function ModalFormDemo({ back }: { back: () => void }): JSX.Element {
  const player = usePlayer();

  const handleSubmit = (values: FormValues): void => {
    const difficultyIndex = Number(values.difficulty ?? 0);

    player.sendMessage('§a[Modal Form] submitted:');
    player.sendMessage(`§7  name: §f${String(values.name ?? '')}`);
    player.sendMessage(`§7  notifications: §f${String(values.notifications ?? false)}`);
    player.sendMessage(`§7  difficulty: §f${DIFFICULTIES[difficultyIndex] ?? '?'}`);
    player.sendMessage(`§7  volume: §f${String(values.volume ?? 0)}%`);

    back();
  };

  return (
    <Form
      title={'Native Modal Form'}
      submitLabel={'Save'}
      onSubmit={handleSubmit}
      onCancel={back}
    >
      <Form.Input name={'name'} label={'§fName'} placeholder={'type your name'} />
      <Form.Toggle name={'notifications'} label={'§fEnable notifications'} defaultValue={true} />
      <Form.Dropdown name={'difficulty'} label={'§fDifficulty'} options={DIFFICULTIES} defaultValue={'Normal'} />
      <Form.Slider name={'volume'} label={'§fVolume'} min={0} max={100} step={5} defaultValue={50} />
    </Form>
  );
}
