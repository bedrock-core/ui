/** @jsxImportSource @bedrock-core/ui */
import { Button, Fragment, Panel, Text, createContext, useContext, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';
import { theme } from './tokens';

interface RadioContextValue {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

const RadioGroupContext = createContext<RadioContextValue>({
  value: '',
  onChange: () => {},
  disabled: false,
});

export interface RadioGroupProps extends ControlProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  children: JSX.Node;
}

export function RadioGroup({
  value,
  defaultValue = '',
  onChange,
  disabled = false,
  children,
  ...layout
}: RadioGroupProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;

  function handleChange(v: string): void {
    setInternal(v);
    onChange?.(v);
  }

  return (
    <RadioGroupContext value={{ value: selected, onChange: handleChange, disabled }}>
      <Panel flexDirection={'column'} gap={theme.components.radio.gap} {...layout}>
        {children}
      </Panel>
    </RadioGroupContext>
  );
}

export interface RadioProps extends ControlProps {
  value: string;
  label?: string;
  disabled?: boolean;
}

export function Radio({ value, label, disabled, ...layout }: RadioProps): JSX.Element {
  const ctx = useContext(RadioGroupContext);
  const isDisabled = disabled ?? ctx.disabled;
  const isSelected = ctx.value === value;

  function handle(): void {
    if (!isDisabled) {
      ctx.onChange(value);
    }
  }

  const t = theme.components.radio.textures;

  return (
    <Panel flexDirection={'row'} alignItems={'center'} gap={theme.components.radio.gap} {...layout}>
      <Fragment>
        <Button
          width={theme.components.radio.size}
          height={theme.components.radio.size}
          background={isSelected ? t.selected : t.unselected}
          backgroundHover={isSelected ? t.selectedHover : t.unselectedHover}
          backgroundPressed={isSelected ? t.unselected : t.selected}
          backgroundLocked={isSelected ? t.selectedDisabled : t.unselectedDisabled}
          onPress={handle}
          enabled={!isDisabled}
        />
        <Text>{label ?? ''}</Text>
      </Fragment>
    </Panel>
  );
}
