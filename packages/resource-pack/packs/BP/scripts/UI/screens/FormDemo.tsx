import { Card, Divider, theme } from '@bedrock-core/ore-styled';
import { Input, Text, useState, type JSX } from '@bedrock-core/ui';

const { spacing, fontColor } = theme.tokens;
const fieldBg = theme.components.button.variants.secondary.textures;

/**
 * Demonstrates modal-backed inputs: each Input is a button that looks like a
 * field; pressing it opens a single-field ModalFormData and feeds the result
 * back into state (confirm commits, cancel keeps).
 */
export function FormDemo(): JSX.Element {
  const [name, setName] = useState('');

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
        background={fieldBg.default}
        paddingLeft={8}
        paddingRight={8}
        paddingTop={4}
        paddingBottom={4}
      />
      <Text>{`Echo: ${name !== '' ? `§a${name}` : '§8(empty)'}`}</Text>
    </Card>
  );
}
