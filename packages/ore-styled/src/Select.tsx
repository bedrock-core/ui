import { Button, Fragment, Image, Panel, Text, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES, SIZE } from './tokens';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends ControlProps {
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function Select({
  value,
  defaultValue = '',
  options,
  placeholder = 'Select...',
  onChange,
  disabled = false,
  ...layout
}: SelectProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = value ?? internal;
  const selectedOption = options.find(o => o.value === selected);

  function handleToggle(): void {
    if (!disabled) {
      setOpen(!open);
    }
  }

  function handleSelect(v: string): void {
    setInternal(v);
    onChange?.(v);
    setOpen(false);
  }

  return (
    <Panel flexDirection={'column'} {...layout}>
      <Button
        onPress={handleToggle}
        enabled={!disabled}
        flexDirection={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        paddingLeft={SPACING.sm}
        paddingRight={SPACING.sm}
        paddingTop={SPACING.xs}
        paddingBottom={SPACING.xs}
        height={SIZE.md}
      >
        <Fragment>
          <Image texture={TEXTURES.select.background} />
          <Text>{selectedOption?.label ?? placeholder}</Text>
          <Image width={SIZE.icon} height={SIZE.icon} texture={TEXTURES.select.arrow} />
        </Fragment>
      </Button>
      <Panel visible={open} flexDirection={'column'}>
        <Fragment>
          <Image texture={TEXTURES.select.dropdown} />
          <Fragment>
            {options.map(opt => (
              <Button
                onPress={() => handleSelect(opt.value)}
                paddingLeft={SPACING.sm}
                paddingRight={SPACING.sm}
                paddingTop={SPACING.xs}
                paddingBottom={SPACING.xs}
              >
                <Fragment>
                  <Image
                    texture={
                      opt.value === selected
                        ? TEXTURES.select.itemSelected
                        : TEXTURES.select.item
                    }
                  />
                  <Text>{opt.label}</Text>
                </Fragment>
              </Button>
            ))}
          </Fragment>
        </Fragment>
      </Panel>
    </Panel>
  );
}
