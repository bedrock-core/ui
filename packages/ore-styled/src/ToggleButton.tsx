import { Button, Panel, createContext, useContext, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SIZE, SPACING, TEXTURES } from './tokens';

// ─── context ──────────────────────────────────────────────────────────────────

interface ToggleButtonGroupContextValue {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

const ToggleButtonGroupContext = createContext<ToggleButtonGroupContextValue>({
  value: '',
  onChange: () => {},
  disabled: false,
});

// ─── ToggleButtonGroup ────────────────────────────────────────────────────────

export interface ToggleButtonGroupProps extends ControlProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  children: JSX.Node;
}

export function ToggleButtonGroup({
  value,
  defaultValue = '',
  onChange,
  disabled = false,
  children,
  ...layout
}: ToggleButtonGroupProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;

  function handleChange(v: string): void {
    setInternal(v);
    onChange?.(v);
  }

  return (
    <ToggleButtonGroupContext value={{ value: selected, onChange: handleChange, disabled }}>
      <Panel flexDirection={'row'} gap={-1} alignSelf={'stretch'} {...layout}>
        {children}
      </Panel>
    </ToggleButtonGroupContext>
  );
}

// ─── ToggleButtonItem ─────────────────────────────────────────────────────────

export interface ToggleButtonItemProps extends ControlProps {
  value: string;
  disabled?: boolean;
  children: JSX.Node;
}

export function ToggleButtonItem({ value, disabled, children, ...layout }: ToggleButtonItemProps): JSX.Element {
  const ctx = useContext(ToggleButtonGroupContext);
  const isDisabled = disabled ?? ctx.disabled;
  const isSelected = ctx.value === value;
  const t = TEXTURES.toggleButton;

  function handle(): void {
    if (!isDisabled) {
      ctx.onChange(value);
    }
  }

  return (
    <Button
      width={0}
      height={SIZE.lg}
      flexGrow={1}
      flexShrink={1}
      justifyContent={'center'}
      alignItems={'center'}
      paddingTop={isSelected ? 2 : 0}
      paddingLeft={SPACING.md}
      paddingRight={SPACING.md}
      background={isSelected ? t.pressed : t.normal}
      backgroundHover={isSelected ? t.pressed : t.hover}
      backgroundPressed={isSelected ? t.disabledPressed : t.pressed}
      backgroundLocked={isSelected ? t.disabledPressed : t.disabled}
      enabled={!isDisabled}
      onPress={handle}
      {...layout}
    >
      {children}
    </Button>
  );
}
