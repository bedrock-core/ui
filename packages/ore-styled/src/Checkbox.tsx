import { Button, Fragment, Panel, Text, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';
import { theme } from './tokens';

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

  const t = theme.components.checkbox.textures;

  return (
    <Panel flexDirection={'row'} alignItems={'center'} gap={theme.components.checkbox.gap} {...layout}>
      <Fragment>
        <Button
          width={theme.components.checkbox.size}
          height={theme.components.checkbox.size}
          background={isChecked ? t.checked : t.unchecked}
          backgroundHover={isChecked ? t.checkedHover : t.uncheckedHover}
          backgroundPressed={isChecked ? t.unchecked : t.checked}
          backgroundLocked={isChecked ? t.checkedDisabled : t.uncheckedDisabled}
          onPress={handle}
          enabled={!disabled}
        />
        <Text>{label ?? ''}</Text>
      </Fragment>
    </Panel>
  );
}
