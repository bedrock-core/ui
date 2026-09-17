/** @jsxImportSource @bedrock-core/ui-runtime */
import type { SingleSelectProps, JSX, Spacing } from '@bedrock-core/ui-runtime';
import { Button, Fragment, Option, Panel, Select as PrimitiveSelect, Text, useMechanism, useState } from '@bedrock-core/ui-runtime';
import { labeledColumn } from './Form/label';
import { theme } from './tokens';

/** One option: a stable `value` and the label shown for it. */
export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioProps extends Omit<SingleSelectProps, 'children' | 'multiple'> {
  // `children` is the one omission: this layer owns the option children, built
  // from `options` below, so a caller-supplied child could only fight the array.
  /** The options, top to bottom. */
  options: RadioOption[];
  /** Caption rendered above the group. */
  label?: string;
  /** Row height per option. */
  rowHeight?: number;
  /** Gap between rows. */
  gap?: Spacing;
  /** Held by the caller instead of by the group; only where a press reaches script. */
  value?: string;
  /** Called with the chosen value, on the hosts where a press reaches script. */
  onChange?: (value: string) => void;
}

/**
 * A single choice out of several, every option visible: a bullet and a label
 * per row.
 *
 * One component for every host. On a modal it is the engine's own inline
 * select, whose answer arrives at submit as the chosen option's INDEX; anywhere
 * a press reaches script each row is a button and `onChange` is called with the
 * value. A screen that can draw neither refuses it at build, in its own words.
 *
 * The rows are laid out by OUR flex system either way, so the geometry is this
 * layer's: change `rowHeight` or `gap` and the in-game layout follows with no
 * JSON UI edit. Row surfaces default to nothing — the bullet carries the look.
 */
export function Radio({
  name, options, defaultValue, enabled = true, label,
  rowHeight = 17, gap = 2, background, value, onChange,
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
  optionFont, optionScale, optionAlign,
  ...layout
}: RadioProps): JSX.Element {
  const r = theme.components.radio;
  const s = theme.components.form.labelStyle;
  const own = label === undefined ? layout : { width: '100%' as const };

  const control = useMechanism('Select') === 'field'
    ? (
        <PrimitiveSelect
          name={name}
          defaultValue={defaultValue}
          enabled={enabled}
          background={background}
          flexDirection={'column'}
          gap={gap}
          {...own}
          // Group-level option defaults; each `Option` inherits these.
          optionBackground={optionBackground ?? ''}
          optionHover={optionHover ?? ''}
          optionSelected={optionSelected ?? ''}
          bullet={bullet ?? r.textures.unselected}
          bulletSelected={bulletSelected ?? r.textures.selected}
          bulletHover={bulletHover ?? r.textures.unselectedHover}
          bulletSelectedHover={bulletSelectedHover ?? r.textures.selectedHover}
          bulletWidth={bulletWidth ?? r.size}
          bulletHeight={bulletHeight ?? r.size}
          optionFont={optionFont ?? s.font}
          optionScale={optionScale ?? s.scale}
          optionAlign={optionAlign ?? 'left'}
        >
          {options.map(o => (
            <Option value={o.value} label={o.label} width={'100%'} height={rowHeight} />
          ))}
        </PrimitiveSelect>
      )
    : (
        <Pressed
          options={options}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          enabled={enabled}
          gap={gap}
          rowHeight={rowHeight}
          {...own}
        />
      );

  return labeledColumn(label, enabled, layout, control);
}

interface PressedProps {
  options: RadioOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  enabled: boolean;
  gap: Spacing;
  rowHeight: number;
}

/** The group where a press is what reaches script: a button per row. */
function Pressed({ options, defaultValue, value, onChange, enabled, gap, rowHeight, ...layout }: PressedProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const chosen = value ?? internal;
  const r = theme.components.radio;

  return (
    <Panel flexDirection={'column'} gap={gap} {...layout}>
      {options.map((option) => {
        const isChosen = option.value === chosen;

        function handle(): void {
          if (enabled) {
            setInternal(option.value);
            onChange?.(option.value);
          }
        }

        return (
          <Panel flexDirection={'row'} alignItems={'center'} gap={r.gap} height={rowHeight}>
            <Fragment>
              <Button
                width={r.size}
                height={r.size}
                background={isChosen ? r.textures.selected : r.textures.unselected}
                backgroundHover={isChosen ? r.textures.selectedHover : r.textures.unselectedHover}
                backgroundPressed={isChosen ? r.textures.unselected : r.textures.selected}
                backgroundLocked={isChosen ? r.textures.selectedDisabled : r.textures.unselectedDisabled}
                onPress={handle}
                enabled={enabled}
              />
              <Text>{option.label}</Text>
            </Fragment>
          </Panel>
        );
      })}
    </Panel>
  );
}
