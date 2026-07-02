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
    player.sendMessage(`§7  nickname: §f${String(values.nickname ?? '')}`);
    player.sendMessage(`§7  volume: §f${String(values.volume ?? 0)}`);
    player.sendMessage(`§7  mode: §f${String(values.mode ?? '')}`);

    back();
  };

  return (
    <Form
      submitLabel={'Save'}
      onSubmit={handleSubmit}
      onCancel={back}
    >
      <Panel flexDirection={'column'} gap={2} padding={4} background={'textures/ui/ore-styled/card/dark/background'}>
        {/* Fully default-styled: every surface falls back to textures/ui/unstyled. */}
        <Form.Dropdown
          name={'asdsa'}
          options={['Easy', 'Normal', 'Hard']}
          defaultValue={'Normal'}
          optionAlign={'center'}
        />
        <Form.Toggle name={'toggle_a'} defaultValue={true} />
        {/* Styled via payload: ore's purpose-built toggle set; toggle_a/c stay unstyled. */}
        <Form.Toggle
          name={'toggle_b'}
          defaultValue={false}
          background={'textures/ui/ore-styled/toggle/off'}
          backgroundHover={'textures/ui/ore-styled/toggle/off_hover'}
          backgroundLocked={'textures/ui/ore-styled/toggle/off_disabled'}
          checkedBackground={'textures/ui/ore-styled/toggle/on'}
          checkedHover={'textures/ui/ore-styled/toggle/on_hover'}
          checkedLocked={'textures/ui/ore-styled/toggle/on_disabled'}
        />
        <Form.Toggle name={'toggle_c'} defaultValue={true} />
      </Panel>
      <Panel flexDirection={'column'} gap={2} padding={4} background={'textures/ui/ore-styled/card/dark/background'}>
        {/* Styled via payload: ore's field + slider sets. */}
        <Form.Input
          name={'nickname'}
          placeholder={'§7type here'}
          // background={'textures/ui/ore-styled/field/background'}
          // backgroundHover={'textures/ui/ore-styled/field/background_hover'}
          // backgroundLocked={'textures/ui/ore-styled/field/background_disabled'}
        />
        <Panel width={'50%'} background={'textures/ui/recipe_book_group_expanded'}>
          {/* Custom geometry probe: tall track + wide short thumb (defaults are 10/10x16). */}
          <Form.Slider
            name={'volume'}
            min={0}
            max={10}
            defaultValue={5}
            trackHeight={6}
            thumbWidth={16}
            thumbHeight={16}
            background={'textures/ui/ore-styled/slider/track'}
            progress={'textures/ui/ore-styled/slider/progress'}
            thumb={'textures/ui/ore-styled/slider/thumb'}
            thumbHover={'textures/ui/ore-styled/slider/thumb_hover'}
            thumbLocked={'textures/ui/ore-styled/slider/thumb_disabled'}
          />
        </Panel>
        {/* Fully default-styled: every surface falls back to textures/ui/unstyled. */}
        <Form.Dropdown
          name={'mode'}
          options={['Easy', 'Normal', 'Hard', 'Expert', 'Insane', 'Nightmare', 'Ultra', 'Custom']}
          defaultValue={'Normal'}
          optionFont={'minecraftTen'}
          optionScale={0.8}
        />
      </Panel>
    </Form>
  );
}
