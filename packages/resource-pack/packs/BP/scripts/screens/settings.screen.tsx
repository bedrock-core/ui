/** @jsxImportSource @bedrock-core/ui */
import { Form } from '@bedrock-core/ore-styled';
import type { JSX, SubmitEvent } from '@bedrock-core/ui';
import { Panel, Text } from '@bedrock-core/ui';

/**
 * A COMPILED MODAL screen — the same authoring as every other screen here.
 *
 * Nothing in this file says it is compiled. It has a `<Form>` at its root, so
 * the build compiles it for the form-modal host; drop the `<Form>` and the same
 * components compile for the action host instead.
 *
 * ## What is drawn by whom, which is the whole design
 *
 * The widgets are the ENGINE's. The thing that reads and writes the player's
 * answer — the edit box, the slider, the toggle — is a native control, and no
 * pack replaces it. But the compiled screen PLACES each one itself, exactly
 * where the layout put it, and the control owns its `custom_form` row through
 * a baked `collection_index` plus its own `collection_details` binding.
 *
 * Everything else here is the PACK's: the heading and both buttons.
 * `Form.Button` is not a native control at all — it takes no `formValues` slot
 * and the engine will not draw it — so a compiled screen draws it itself and
 * routes the press to `button.submit_custom_form`.
 *
 * ## What it costs
 *
 * Opening this sends the title and two bare rows. An interpreted modal sends a
 * serialized control block per field instead, which S5 priced at 14 ms of
 * server work for 50 cells and 53 ms for 200 — on every open.
 *
 * ## Known limits
 *
 * Fields stack at a uniform height. A factory row knows its index, not its
 * rect, so ordering is all a compiled modal can decide for them today; the
 * decoration around them is placed freely.
 *
 * Every field is styled from the props the ore-styled components pass down:
 * the library ships no look of its own, and a compiled screen bakes whatever
 * textures it is given, exactly as a `Button`'s face works.
 */
export default function Settings(): JSX.Element {
  const handleSubmit = ({ player, values }: SubmitEvent): void => {
    player.sendMessage(`§aSaved:§r ${JSON.stringify(values)}`);
  };

  // No onCancel: a handler that does not exit() means "stay open", so dismissing
  // would re-present. Without one, Escape tears the session down.
  return (
    <Form onSubmit={handleSubmit}>
      <Panel gap={4}>
        <Text>{'§fCOMPILED MODAL'}</Text>

        {/* One of each kind, so a compiled modal is exercised end to end.
            These are the ORE-STYLED components: they pass the theme's textures
            down as props, and the compiled screen bakes whatever props it is
            given. The base library ships no look of its own. */}
        <Form.Toggle label={'Sound'} name={'sound'} defaultValue={true} />
        <Form.Slider label={'Volume'} name={'volume'} min={0} max={10} defaultValue={7} />
        <Form.Input label={'Nickname'} name={'nick'} defaultValue={'steve'} placeholder={'type a name...'} />
        <Form.Dropdown label={'Mode'} name={'mode'} options={['Easy', 'Normal', 'Hard']} defaultValue={'Normal'} />

        <Panel flexDirection={'row'} gap={4}>
          <Form.Button type={'submit'} label={'Save'} flex={2} />
          <Form.Button type={'exit'} label={'Close'} flex={1} />
        </Panel>
      </Panel>
    </Form>
  );
}
