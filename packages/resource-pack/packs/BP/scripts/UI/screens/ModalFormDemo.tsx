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
      <Panel flexDirection={'row'} gap={2} padding={4} background={'textures/ui/recipe_book_group_expanded'}>
        <Form.Toggle name={'toggle_a'} label={'§fToggle A'} defaultValue={true} />
        <Form.Toggle name={'toggle_b'} label={'§fToggle B'} defaultValue={false} />
        <Form.Toggle name={'toggle_c'} label={'§fToggle C'} defaultValue={true} />
      </Panel>
      <Panel flexDirection={'column'} gap={2} padding={4} background={'textures/ui/recipe_book_group_expanded'}>
        <Form.Toggle name={'toggle_d'} label={'§fToggle D'} defaultValue={true} />
        <Form.Toggle name={'toggle_e'} label={'§fToggle E'} defaultValue={false} />
        <Form.Toggle name={'toggle_f'} label={'§fToggle F'} defaultValue={true} />

        <Form.Toggle name={'toggle_g'} label={'§fToggle G'} defaultValue={true} />
        <Form.Toggle name={'toggle_h'} label={'§fToggle H'} defaultValue={false} />
        <Form.Toggle name={'toggle_i'} label={'§fToggle I'} defaultValue={true} />

        <Form.Toggle name={'toggle_j'} label={'§fToggle J'} defaultValue={true} />
        <Form.Toggle name={'toggle_k'} label={'§fToggle K'} defaultValue={false} />
        <Form.Toggle name={'toggle_l'} label={'§fToggle L'} defaultValue={true} />

        <Form.Toggle name={'toggle_m'} label={'§fToggle M'} defaultValue={true} />
        <Form.Toggle name={'toggle_n'} label={'§fToggle N'} defaultValue={false} />
        <Form.Toggle name={'toggle_o'} label={'§fToggle O'} defaultValue={true} />

        <Form.Toggle name={'toggle_p'} label={'§fToggle P'} defaultValue={true} />
        <Form.Toggle name={'toggle_q'} label={'§fToggle Q'} defaultValue={false} />
        <Form.Toggle name={'toggle_r'} label={'§fToggle R'} defaultValue={true} />

        <Form.Toggle name={'toggle_s'} label={'§fToggle S'} defaultValue={true} />
        <Form.Toggle name={'toggle_t'} label={'§fToggle T'} defaultValue={false} />
        <Form.Toggle name={'toggle_u'} label={'§fToggle U'} defaultValue={true} />

        <Form.Toggle name={'toggle_v'} label={'§fToggle V'} defaultValue={true} />
        <Form.Toggle name={'toggle_w'} label={'§fToggle W'} defaultValue={false} />
        <Form.Toggle name={'toggle_x'} label={'§fToggle X'} defaultValue={true} />
      </Panel>
    </Form>
  );
}
