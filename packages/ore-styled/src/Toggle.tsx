import { Button, Image, useState } from '@bedrock-core/ui';
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

  const texture = disabled
    ? TEXTURES.toggle.disabled
    : isOn
      ? TEXTURES.toggle.on
      : TEXTURES.toggle.off;

  return (
    <Button
      onPress={handle}
      enabled={!disabled}
      width={SIZE.toggle.width}
      height={SIZE.toggle.height}
      {...layout}
    >
      <Image width={SIZE.toggle.width} height={SIZE.toggle.height} texture={texture} />
    </Button>
  );
}
