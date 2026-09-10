/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInlineSelectProps as PrimitiveInlineSelectProps, JSX, Spacing } from '@bedrock-core/ui-runtime';
import { Button, Form as PrimitiveForm, Panel, Text, useMechanism, useState } from '@bedrock-core/ui-runtime';
import { labeledColumn } from './Form/label';
import { theme } from './tokens';

/** One segment: a stable `value` and the label shown on it. */
export interface ToggleButtonOption {
  value: string;
  label: string;
}

export interface ToggleButtonGroupProps extends Omit<PrimitiveInlineSelectProps, 'children'> {
  // `children` is the one omission: this layer owns the option children, built
  // from `options` below, so a caller-supplied child could only fight the array.
  /** The segments, left to right. */
  options: ToggleButtonOption[];
  /** Caption rendered above the group. */
  label?: string;
  /** Segment height. */
  segmentHeight?: number;
  /** Gap between segments. `-1` is the overlap that fuses adjacent borders. */
  gap?: Spacing;
  /** Held by the caller instead of by the group; only where a press reaches script. */
  value?: string;
  /** Called with the chosen value, on the hosts where a press reaches script. */
  onChange?: (value: string) => void;
}

/**
 * A single choice out of several, drawn as side-by-side segments.
 *
 * The same choice a {@link Radio} makes, in the shape a segmented control
 * wears: one component for every host, the engine's inline select on a modal
 * and a row of buttons anywhere a press reaches script.
 *
 * The segments are laid out by OUR flex system either way — equal widths and a
 * one-pixel overlap so adjacent borders fuse — so the geometry is this layer's
 * and no JSON UI edit follows a change here.
 */
export function ToggleButtonGroup({
  name, options, defaultValue, enabled = true, label,
  segmentHeight = theme.components.toggleButton.height, gap = -1, background, value, onChange,
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
  optionFont, optionScale, optionAlign,
  ...layout
}: ToggleButtonGroupProps): JSX.Element {
  const tb = theme.components.toggleButton;
  const ts = tb.textStyle.selected;
  const own = label === undefined ? layout : { width: '100%' as const };

  const control = useMechanism('Select') === 'field'
    ? (
        <PrimitiveForm.InlineSelect
          name={name}
          defaultValue={defaultValue}
          enabled={enabled}
          background={background}
          flexDirection={'row'}
          gap={gap}
          {...own}
          optionBackground={optionBackground ?? tb.textures.normal}
          optionHover={optionHover ?? tb.textures.hover}
          optionSelected={optionSelected ?? tb.textures.pressed}
          // Glyph-less segments are the themed value; a caller who opts INTO a
          // bullet gets the primitive's own `?? bullet` chain across the states.
          bullet={bullet ?? ''}
          bulletSelected={bulletSelected ?? ''}
          bulletHover={bulletHover}
          bulletSelectedHover={bulletSelectedHover}
          bulletWidth={bulletWidth}
          bulletHeight={bulletHeight}
          optionFont={optionFont ?? ts.font}
          optionScale={optionScale ?? ts.scale}
          optionAlign={optionAlign ?? 'center'}
        >
          {options.map(o => (
            <PrimitiveForm.Option value={o.value} label={o.label} flexGrow={1} flexShrink={1} height={segmentHeight} />
          ))}
        </PrimitiveForm.InlineSelect>
      )
    : (
        <Pressed
          options={options}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          enabled={enabled}
          gap={gap}
          segmentHeight={segmentHeight}
          {...own}
        />
      );

  return labeledColumn(label, enabled, layout, control);
}

interface PressedProps {
  options: ToggleButtonOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  enabled: boolean;
  gap: Spacing;
  segmentHeight: number;
}

/** The group where a press is what reaches script: a button per segment. */
function Pressed({ options, defaultValue, value, onChange, enabled, gap, segmentHeight, ...layout }: PressedProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const chosen = value ?? internal;
  const tb = theme.components.toggleButton;

  return (
    <Panel flexDirection={'row'} gap={gap} alignSelf={'stretch'} {...layout}>
      {options.map((option) => {
        const isChosen = option.value === chosen;
        const style = isChosen ? tb.textStyle.selected : tb.textStyle.unselected;

        function handle(): void {
          if (enabled) {
            setInternal(option.value);
            onChange?.(option.value);
          }
        }

        return (
          <Button
            width={0}
            height={segmentHeight}
            flexGrow={1}
            flexShrink={1}
            justifyContent={'center'}
            alignItems={'center'}
            // The chosen segment sits a pixel lower, which is what reads as pressed.
            paddingTop={isChosen ? 2 : 0}
            paddingLeft={tb.paddingX}
            paddingRight={tb.paddingX}
            background={isChosen ? tb.textures.pressed : tb.textures.normal}
            backgroundHover={isChosen ? tb.textures.pressed : tb.textures.hover}
            backgroundPressed={isChosen ? tb.textures.disabledPressed : tb.textures.pressed}
            backgroundLocked={isChosen ? tb.textures.disabledPressed : tb.textures.disabled}
            enabled={enabled}
            onPress={handle}
          >
            <Text font={style.font} scale={style.scale}>
              {`${enabled ? style.color : style.disabledColor}${option.label}`}
            </Text>
          </Button>
        );
      })}
    </Panel>
  );
}
