import { Card, Divider, theme } from '@bedrock-core/ore-styled';
import { Dropdown, Input, Slider, Text, useState, type JSX } from '@bedrock-core/ui';

const { spacing, fontColor } = theme.tokens;
const fieldBg = theme.components.button.variants.secondary.textures;

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

  const field = {
    background: fieldBg.default,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
  };

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
        {...field}
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
        {...field}
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
        {...field}
      />
      <Text>{`Echo: §a${volume}%`}</Text>
    </Card>
  );
}
