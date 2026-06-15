/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DropdownProps as PrimitiveDropdownProps, JSX } from '@bedrock-core/ui-runtime';
import { Dropdown as PrimitiveDropdown, Image, Panel, Text, useState } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

export interface DropdownProps extends Omit<PrimitiveDropdownProps, 'face'> {}

export function Dropdown({
  options,
  value,
  defaultValue,
  onChange,
  enabled = true,
  ...rest
}: DropdownProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue ?? options[0] ?? '');
  const current = value ?? internal;

  const t = theme.components.field;
  const d = theme.components.dropdown;
  const color = enabled === false ? d.textStyle.disabled : d.textStyle.value;

  function handleChange(next: string, index: number): void {
    setInternal(next);
    onChange?.(next, index);
  }

  const face = (
    <Panel flexDirection={'row'} alignItems={'center'} gap={t.gap} width={'100%'}>
      <Text font={d.textStyle.font} scale={d.textStyle.scale} flexGrow={1}>{`${color}${current}`}</Text>
      <Image
        texture={enabled === false ? d.textures.arrowDisabled : d.textures.arrow}
        width={d.arrow.width}
        height={d.arrow.height}
      />
    </Panel>
  );

  return (
    <PrimitiveDropdown
      background={d.textures.background}
      backgroundHover={d.textures.backgroundHover}
      backgroundPressed={d.textures.backgroundHover}
      backgroundLocked={d.textures.backgroundDisabled}
      paddingLeft={d.padding.x}
      paddingRight={d.padding.x}
      paddingTop={d.padding.top}
      paddingBottom={d.padding.bottom}
      flexDirection={'row'}
      justifyContent={'flex-start'}
      alignItems={'center'}
      {...rest}
      options={options}
      value={current}
      onChange={handleChange}
      enabled={enabled}
      face={face}
    />
  );
}
