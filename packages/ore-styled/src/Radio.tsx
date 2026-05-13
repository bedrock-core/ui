import { Button, Fragment, Image, Panel, Text, createContext, useContext, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES, SIZE } from './tokens';

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
      <Panel flexDirection={'column'} gap={SPACING.sm} {...layout}>
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

  const texture = isDisabled
    ? TEXTURES.radio.disabled
    : isSelected
      ? TEXTURES.radio.selected
      : TEXTURES.radio.unselected;

  function handle(): void {
    if (!isDisabled) {
      ctx.onChange(value);
    }
  }

  return (
    <Button
      onPress={handle}
      enabled={!isDisabled}
      flexDirection={'row'}
      alignItems={'center'}
      gap={SPACING.sm}
      {...layout}
    >
      <Fragment>
        <Image width={SIZE.radio} height={SIZE.radio} texture={texture} />
        <Text>{label ?? ''}</Text>
      </Fragment>
    </Button>
  );
}
