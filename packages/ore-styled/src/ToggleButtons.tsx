/** @jsxImportSource @bedrock-core/ui-runtime */
import type { JSX, Spacing } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, ModalFormError, Panel, Text, useMechanism } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

/** One segment: what its answer is reported under, the word on it, and how it starts. */
export interface ToggleButtonsOption {
  /** Every segment answers on its own, so each needs a name of its own. */
  name: string;
  label: string;
  on?: boolean;
}

export interface ToggleButtonsProps {
  /** The segments, left to right. */
  options: ToggleButtonsOption[];
  enabled?: boolean;
  /** Segment height. */
  segmentHeight?: number;
  /** Gap between segments. `-1` is the overlap that fuses adjacent borders. */
  gap?: Spacing;
}

/**
 * Several choices out of a set, drawn as side-by-side segments.
 *
 * The many-of sibling of {@link ToggleButtonGroup}: the same segmented shape,
 * but each segment is a boolean of its own rather than one choice among the
 * row, so any number of them can be on at once. Every segment answers under
 * its own name, and the caller folds those answers back into whatever the set
 * means to it.
 *
 * A segment is the engine's own toggle wearing the segment textures, with its
 * word drawn over it: a native field draws nothing but its faces, so the label
 * is a sibling above it, centred by the segment's own box. The word keeps one
 * colour whichever way the segment is — the face is what says which.
 *
 * A modal is the one screen with a native toggle to stand each segment on, so
 * this refuses anywhere else by name rather than drawing segments that answer
 * nothing.
 */
export function ToggleButtons({
  options, enabled = true, segmentHeight = theme.components.toggleButton.height, gap = -1,
}: ToggleButtonsProps): JSX.Element {
  if (useMechanism('Toggle') !== 'field') {
    throw new ModalFormError('`ToggleButtons` needs the modal\'s native toggles: render it inside a `<Form>`.');
  }

  const tb = theme.components.toggleButton;
  const ts = tb.textStyle.unselected;

  return (
    <Panel flexDirection={'row'} gap={gap} width={'100%'}>
      {options.map(option => (
        <Panel width={0} flexGrow={1} flexShrink={1} height={segmentHeight} justifyContent={'center'} alignItems={'center'}>
          <PrimitiveForm.Toggle
            name={option.name}
            defaultValue={option.on === true}
            enabled={enabled}
            position={'absolute'}
            top={0}
            left={0}
            width={'100%'}
            height={'100%'}
            background={tb.textures.normal}
            backgroundHover={tb.textures.hover}
            backgroundLocked={tb.textures.disabled}
            checkedBackground={tb.textures.pressed}
            checkedHover={tb.textures.pressed}
            checkedLocked={tb.textures.disabledPressed}
          />
          <Text font={ts.font} scale={ts.scale} zIndex={10}>
            {`${enabled ? ts.color : ts.disabledColor}${option.label}`}
          </Text>
        </Panel>
      ))}
    </Panel>
  );
}
