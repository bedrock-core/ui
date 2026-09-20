/** @jsxImportSource @bedrock-core/ui */
import { world } from '@minecraft/server';
import { Dropdown, Form, Input, Slider, Toggle } from '@bedrock-core/ui/ore-styled';
import { type JSX, Panel, Text } from '@bedrock-core/ui';
import { back } from '@bedrock-core/ui/navigation';

/**
 * A native modal form (ModalFormData-backed): every field's value arrives once, in
 * onSubmit, keyed by its `name`. Exactly one Form.Button type="submit" is required.
 *
 * Compiled as `{{CREATOR_ID}}_{{PACK_ID}}:profile_form`.
 */
export default function ProfileForm(): JSX.Element {
  return (
    <Form
      onSubmit={({ player, values }): void => {
        // values.nick / values.difficulty / values.volume / values.notify
        world.sendMessage(`§aSaved profile: ${String(values.nick)}`);
        back(player);
      }}
      onCancel={({ player }): void => { back(player); }}
    >
      <Panel flexDirection={'column'}>
        <Text>{'§lProfile'}</Text>
        <Input name={'nick'} label={'Nickname'} placeholder={'Steve'} />
        <Dropdown name={'difficulty'} label={'Difficulty'} options={['Peaceful', 'Easy', 'Normal', 'Hard']} />
        <Slider name={'volume'} label={'Volume'} min={0} max={10} defaultValue={7} />
        <Toggle name={'notify'} label={'Notifications'} defaultValue={true} />
        <Form.Button type={'submit'} label={'Save'} />
        <Form.Button type={'exit'} label={'Cancel'} />
      </Panel>
    </Form>
  );
}
