/** @jsxImportSource @bedrock-core/ui-runtime */
import type { InputProps as PrimitiveInputProps, JSX } from '@bedrock-core/ui-runtime';
import { Input as PrimitiveInput, Text, useState } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

export interface InputProps extends Omit<PrimitiveInputProps, 'face'> {}

export function Input({
  value,
  defaultValue,
  onChange,
  placeholder,
  enabled = true,
  ...rest
}: InputProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const current = value ?? internal;

  const t = theme.components.field;
  const isEmpty = current === '';
  const display = isEmpty ? (placeholder ?? '') : current;
  const color = enabled === false
    ? t.textStyle.disabled
    : isEmpty
      ? t.textStyle.placeholder
      : t.textStyle.value;

  function handleChange(next: string): void {
    setInternal(next);
    onChange?.(next);
  }

  return (
    <PrimitiveInput
      background={t.textures.background}
      backgroundHover={t.textures.backgroundHover}
      backgroundPressed={t.textures.backgroundHover}
      backgroundLocked={t.textures.backgroundDisabled}
      paddingLeft={t.padding.x}
      paddingRight={t.padding.x}
      paddingTop={t.padding.top}
      paddingBottom={t.padding.bottom}
      flexDirection={'row'}
      justifyContent={'flex-start'}
      alignItems={'center'}
      {...rest}
      value={current}
      onChange={handleChange}
      placeholder={placeholder}
      enabled={enabled}
      face={<Text font={t.textStyle.font} scale={t.textStyle.scale}>{`${color}${display}`}</Text>}
    />
  );
}
