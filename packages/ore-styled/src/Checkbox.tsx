import { Button, Fragment, Image, Text, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES, SIZE } from './tokens';

export interface CheckboxProps extends ControlProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  ...layout
}: CheckboxProps): JSX.Element {
  const [internal, setInternal] = useState(defaultChecked);
  const isChecked = checked ?? internal;

  function handle(): void {
    if (disabled) {
      return;
    }

    const next = !isChecked;

    setInternal(next);
    onChange?.(next);
  }

  const texture = disabled
    ? TEXTURES.checkbox.disabled
    : isChecked
      ? TEXTURES.checkbox.checked
      : TEXTURES.checkbox.unchecked;

  return (
    <Button
      onPress={handle}
      enabled={!disabled}
      flexDirection={'row'}
      alignItems={'center'}
      gap={SPACING.sm}
      {...layout}
    >
      <Fragment>
        <Image width={SIZE.checkbox} height={SIZE.checkbox} texture={texture} />
        <Text>{label ?? ''}</Text>
      </Fragment>
    </Button>
  );
}
