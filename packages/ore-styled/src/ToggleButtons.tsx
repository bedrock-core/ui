/** @jsxImportSource @bedrock-core/ui-runtime */
import type { JSX, MultipleSelectProps, SingleSelectProps, Spacing } from '@bedrock-core/ui-runtime';
import { Button, Option, Panel, Select, Text, useMechanism, useState } from '@bedrock-core/ui-runtime';
import { labeledColumn } from './Form/label';
import { theme } from './tokens';

/** One segment: a stable `value` and the label shown on it. */
export interface ToggleButtonsOption {
  value: string;
  label: string;
}

/** What the segments take, whichever number of choices they make. */
interface Segments {
  // `children` is omitted from the select props below: this layer owns the
  // option children, built from `options`, so a caller-supplied child could
  // only fight the array.
  /** The segments, left to right. */
  options: ToggleButtonsOption[];
  /** Caption rendered above the segments. */
  label?: string;
  /** Segment height. */
  segmentHeight?: number;
  /** Gap between segments. `-1` is the overlap that fuses adjacent borders. */
  gap?: Spacing;
}

export type ToggleButtonsProps
  = | (Omit<SingleSelectProps, 'children'> & Segments)
    | (Omit<MultipleSelectProps, 'children'> & Segments);

/**
 * Choices drawn as side-by-side segments: one, or any number with `multiple`.
 *
 * The two modes are the same control. The segments, their textures and the
 * way a chosen one reads — its face, its label's colour, and the drop — do not
 * change with the number of choices; only whether pressing one lets go of the
 * others does.
 *
 * One component for every host. On a modal it is the engine's own select —
 * one chooser, or a toggle per segment — whose answer arrives at submit as an
 * index, or as the indices that are on. Anywhere a press reaches script each
 * segment is a button and `onChange` is called with the value, or with every
 * chosen value.
 *
 * The segments are laid out by OUR flex system either way — equal widths and a
 * one-pixel overlap so adjacent borders fuse — so the geometry is this layer's
 * and no JSON UI edit follows a change here.
 */
export function ToggleButtons(props: ToggleButtonsProps): JSX.Element {
  const tb = theme.components.toggleButton;
  const ts = tb.textStyle;
  const {
    name, multiple: _multiple, defaultValue: _defaultValue, value: _value, onChange: _onChange,
    options, enabled = true, label, segmentHeight = tb.height, gap = -1, background,
    optionBackground, optionHover, optionSelected,
    bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
    optionFont, optionScale, optionAlign, optionColor, optionColorSelected, optionDropSelected,
    ...layout
  } = props;
  const own = label === undefined ? layout : { width: '100%' as const };
  const mechanism = useMechanism('Select');

  if (mechanism !== 'field') {
    // One shape for both modes: the chosen values as a set, however many there may be.
    const chosen = (value: string | readonly string[] | undefined): string[] | undefined =>
      (value === undefined ? undefined : typeof value === 'string' ? [value] : [...value]);

    return labeledColumn(label, enabled, layout, (
      <Pressed
        options={options}
        multiple={props.multiple === true}
        defaultValue={chosen(props.defaultValue ?? (props.multiple === true ? [] : options[0]?.value)) ?? []}
        value={chosen(props.value)}
        onChange={(next) => {
          if (props.multiple === true) {
            props.onChange?.(next);
          } else {
            props.onChange?.(next[0] ?? '');
          }
        }}
        enabled={enabled}
        gap={gap}
        segmentHeight={segmentHeight}
        {...own}
      />
    ));
  }

  const segments = options.map(option => (
    <Option value={option.value} label={option.label} flexGrow={1} flexShrink={1} height={segmentHeight} />
  ));

  const faces = {
    name,
    enabled,
    background,
    flexDirection: 'row' as const,
    gap,
    ...own,
    // A disabled group wears the disabled faces whichever segments are chosen,
    // as the pressed segments do.
    optionBackground: optionBackground ?? (enabled ? tb.textures.normal : tb.textures.disabled),
    optionHover: optionHover ?? (enabled ? tb.textures.hover : tb.textures.disabled),
    optionSelected: optionSelected ?? (enabled ? tb.textures.pressed : tb.textures.disabledPressed),
    // Glyph-less segments are the themed value; a caller who opts INTO a
    // bullet gets the primitive's own `?? bullet` chain across the states.
    bullet: bullet ?? '',
    bulletSelected: bulletSelected ?? '',
    bulletHover,
    bulletSelectedHover,
    bulletWidth,
    bulletHeight,
    optionFont: optionFont ?? ts.font,
    optionScale: optionScale ?? ts.scale,
    optionAlign: optionAlign ?? 'center',
    optionColor: optionColor ?? (enabled ? ts.unselected : ts.disabled),
    optionColorSelected: optionColorSelected ?? (enabled ? ts.selected : ts.disabled),
    optionDropSelected: optionDropSelected ?? tb.selectedDrop,
  };

  const control = props.multiple === true
    ? <Select {...faces} multiple={true} defaultValue={props.defaultValue}>{segments}</Select>
    : <Select {...faces} defaultValue={props.defaultValue}>{segments}</Select>;

  return labeledColumn(label, enabled, layout, control);
}

interface PressedProps {
  options: ToggleButtonsOption[];
  multiple: boolean;
  defaultValue: string[];
  value?: string[];
  onChange: (values: string[]) => void;
  enabled: boolean;
  gap: Spacing;
  segmentHeight: number;
}

/** The segments where a press is what reaches script: a button per segment. */
function Pressed({ options, multiple, defaultValue, value, onChange, enabled, gap, segmentHeight, ...layout }: PressedProps): JSX.Element {
  const [internal, setInternal] = useState(defaultValue);
  const chosen = value ?? internal;
  const tb = theme.components.toggleButton;
  const ts = tb.textStyle;

  return (
    <Panel flexDirection={'row'} gap={gap} alignSelf={'stretch'} {...layout}>
      {options.map((option) => {
        const isChosen = chosen.includes(option.value);
        // One choice: the chosen segment IS the answer, so pressing it again
        // changes nothing and it takes no press. Several: it lets go when
        // pressed, so it stays live.
        const pressable = enabled && (multiple || !isChosen);

        function handle(): void {
          if (!pressable) {
            return;
          }

          // Several: the pressed segment flips and the rest keep their state,
          // in segment order. One: the pressed segment is the choice.
          const next = multiple
            ? options.map(each => each.value).filter(each => (each === option.value) !== chosen.includes(each))
            : [option.value];

          setInternal(next);
          onChange(next);
        }

        return (
          <Button
            width={0}
            height={segmentHeight}
            flexGrow={1}
            flexShrink={1}
            justifyContent={'center'}
            alignItems={'center'}
            // The label is centred, so padding the top by twice the drop moves
            // it down by the drop — the same drop a modal's segment draws.
            paddingTop={isChosen ? tb.selectedDrop * 2 : 0}
            paddingLeft={tb.paddingX}
            paddingRight={tb.paddingX}
            // A chosen segment wears the pressed face in every state. Locked, it
            // reads disabled only when the whole group is; a chosen segment of a
            // live one-choice group is locked only because it takes no press.
            background={isChosen ? tb.textures.pressed : tb.textures.normal}
            backgroundHover={isChosen ? tb.textures.pressed : tb.textures.hover}
            backgroundPressed={tb.textures.pressed}
            backgroundLocked={isChosen ? (enabled ? tb.textures.pressed : tb.textures.disabledPressed) : tb.textures.disabled}
            enabled={pressable}
            onPress={handle}
          >
            <Text font={ts.font} scale={ts.scale} color={enabled ? (isChosen ? ts.selected : ts.unselected) : ts.disabled}>
              {option.label}
            </Text>
          </Button>
        );
      })}
    </Panel>
  );
}
