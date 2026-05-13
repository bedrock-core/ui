import { Button, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';
import { TEXTURES, SIZE } from './tokens';

export interface ToggleProps extends ControlProps {
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
}

export function Toggle({
  on,
  defaultOn = false,
  onChange,
  disabled = false,
  ...layout
}: ToggleProps): JSX.Element {
  const [internal, setInternal] = useState(defaultOn);
  const isOn = on ?? internal;

  function handle(): void {
    if (disabled) {
      return;
    }

    const next = !isOn;

    setInternal(next);
    onChange?.(next);
  }

  const t = TEXTURES.toggle;

  return (
    <Button
      width={SIZE.toggle.width}
      height={SIZE.toggle.height}
      background={isOn ? t.on : t.off}
      backgroundHover={isOn ? t.onHover : t.offHover}
      backgroundPressed={isOn ? t.off : t.on}
      backgroundLocked={isOn ? t.onDisabled : t.offDisabled}
      onPress={handle}
      enabled={!disabled}
      {...layout}
    />
  );
}
