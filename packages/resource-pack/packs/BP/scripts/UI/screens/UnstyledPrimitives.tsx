/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card } from '@bedrock-core/ore-styled';
import { Button, Dropdown, Image, Input, Panel, Slider, Text, useState, type JSX } from '@bedrock-core/ui';

const MODES = ['Easy', 'Normal', 'Hard', 'Expert'];

/**
 * Every raw `@bedrock-core/ui` primitive with ZERO styling props: each surface
 * falls back to the unstyled placeholder texture (`textures/ui/unstyled`), and the
 * point of the screen is checking that BEHAVIOUR (presses, state textures, modal
 * fields committing values) works before any styling is involved.
 */
export function UnstyledPrimitives(): JSX.Element {
  const [presses, setPresses] = useState(0);
  const [name, setName] = useState('');
  const [volume, setVolume] = useState(5);
  const [mode, setMode] = useState('Normal');

  return (
    <Panel flexDirection={'column'} gap={6} padding={8}>
      <Text>{'§e§lButton'}</Text>
      <Panel flexDirection={'row'} gap={6}>
        <Button width={'50%'} height={20} onPress={(): void => setPresses(presses + 1)}>
          <Text>{`Pressed ${presses} times`}</Text>
        </Button>
        <Button width={'50%'} height={20} enabled={false}>
          <Text>{'Disabled'}</Text>
        </Button>
      </Panel>

      <Text>{'§e§lText maxLength'}</Text>
      {/* A literal is cut to `maxLength` characters; a translation key is left
          whole, since the client resolves it. In a container screen the same
          prop makes the text live. */}
      <Card>
        <Panel flexDirection={'row'} gap={0}>
          <Text maxLength={12}>{'This literal is cut at twelve characters'}</Text>
          <Text maxLength={7}>{'and this one at 7!'}</Text>
        </Panel>
      </Card>
      <Text>{'§e§lImage (default texture)'}</Text>
      <Image width={32} height={32} />

      <Text>{'§e§lModal fields'}</Text>
      <Input
        width={'100%'}
        height={20}
        label={'Name'}
        placeholder={'type your name'}
        value={name}
        onChange={setName}
      />
      <Slider
        width={'100%'}
        height={20}
        label={'Volume'}
        min={0}
        max={10}
        value={volume}
        onChange={setVolume}
      />
      <Dropdown
        width={'100%'}
        height={20}
        label={'Mode'}
        options={MODES}
        value={mode}
        onChange={(v): void => setMode(v)}
      />
      <Text>{`§7name=${name === '' ? '(empty)' : name}  volume=${String(volume)}  mode=${mode}`}</Text>
    </Panel>
  );
}
