import { Card, Divider, Dropdown, Input, Slider, theme } from '@bedrock-core/ore-styled';
import { Text, useState, type JSX } from '@bedrock-core/ui';

const { spacing, fontColor } = theme.tokens;

const DIFFICULTIES = ['Peaceful', 'Easy', 'Normal', 'Hard'];

/**
 * Demonstrates modal-backed inputs: each field is a button that looks like a
 * form control; pressing it opens a single-control ModalFormData and feeds the
 * result back into state (confirm commits, cancel keeps).
 */
export function FormDemo(): JSX.Element {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('Normal');
  const [volume, setVolume] = useState(50);

  return (
    <Card flexDirection={'column'} padding={12} gap={spacing.md}>
      <Text font={'minecraftTen'} scale={1.5}>{'Form Inputs'}</Text>
      <Text>{`${fontColor.muted}Press a field to edit it in a modal — confirm commits, cancel keeps.`}</Text>

      <Divider variant={'light'} />

      {/* Text input → single-field ModalFormData */}
      <Input
        label={'§fName'}
        placeholder={'type your name'}
        value={name}
        onChange={setName}
        title={'Edit name'}
        submitLabel={'Save'}
      />
      <Text>{`Echo: ${name !== '' ? `§a${name}` : '§8(empty)'}`}</Text>

      {/* Dropdown → single-dropdown ModalFormData */}
      <Dropdown
        label={'§fDifficulty'}
        options={DIFFICULTIES}
        value={difficulty}
        onChange={setDifficulty}
        title={'Select difficulty'}
        submitLabel={'Save'}
      />
      <Text>{`Echo: §a${difficulty}`}</Text>

      {/* Slider → single-slider ModalFormData */}
      <Slider
        label={'§fVolume'}
        min={0}
        max={100}
        step={5}
        value={volume}
        onChange={setVolume}
        title={'Set volume'}
        submitLabel={'Save'}
      />
      <Text>{`Echo: §a${volume}%`}</Text>
    </Card>
  );
}
