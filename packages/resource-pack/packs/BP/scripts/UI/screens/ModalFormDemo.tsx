import { Form, Panel, usePlayer, type FormValues, type JSX } from '@bedrock-core/ui';

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
    player.sendMessage('§a[Modal Form] submitted:');
    player.sendMessage(`§7  toggle_a: §f${String(values.toggle_a ?? false)}`);
    player.sendMessage(`§7  toggle_b: §f${String(values.toggle_b ?? false)}`);
    player.sendMessage(`§7  toggle_c: §f${String(values.toggle_c ?? false)}`);

    back();
  };

  return (
    <Form
      submitLabel={'Save'}
      onSubmit={handleSubmit}
      onCancel={back}
    >
      <Panel flexDirection={'row'}>
        <Form.Toggle name={'toggle_a'} label={'§fToggle A'} defaultValue={true} />
        <Form.Toggle name={'toggle_b'} label={'§fToggle B'} defaultValue={false} />
        <Form.Toggle name={'toggle_c'} label={'§fToggle C'} defaultValue={true} />
      </Panel>
    </Form>

  );
}
