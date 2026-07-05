/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FlexSize, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

/** One segment: a stable `value` + its shown `label`. */
export interface FormToggleButtonOption {
  value: string;
  label: string;
}

export interface FormToggleButtonProps {
  /** Result key — the selected option's INDEX arrives at `values[name]` in `Form.onSubmit`. */
  name: string;
  /** The segments, left to right. */
  options: FormToggleButtonOption[];
  /** Initial selected value (matched to its index). Defaults to the first option. */
  defaultValue?: string;
  /** Whether the group is interactive. */
  enabled?: boolean;
  /** Caption rendered above the group. */
  label?: string;
  /** Segment height (px). */
  segmentHeight?: number;
  /** Layout props for the group container. */
  flex?: number;
  width?: FlexSize;
}

/**
 * Ore-styled modal toggle-button group: a single-select rendered INLINE as side-by-side segments —
 * the same look as the ActionForm `ToggleButtonGroup`. `onSubmit` reports the selected option's
 * INDEX. The selected segment uses the pressed face.
 *
 * Segments are laid out by OUR flex system as `Form.Option` children with `flexGrow:1` (equal
 * width) and `gap:-1` (1px overlap) — exactly the non-form control's row. Change the flex here and
 * the in-game layout follows with no JSON-UI edit.
 */
export function FormToggleButton({
  name, options, defaultValue, enabled = true, label,
  segmentHeight = theme.components.toggleButton.height, flex, width,
}: FormToggleButtonProps): JSX.Element {
  const tb = theme.components.toggleButton;
  const ts = tb.textStyle.selected;

  const control = (
    <PrimitiveForm.InlineSelect
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      flexDirection={'row'}
      gap={-1}
      {...(label === undefined ? { flex, width } : { width: '100%' })}
      optionBackground={tb.textures.normal}
      optionHover={tb.textures.hover}
      optionSelected={tb.textures.pressed}
      bullet={''}
      bulletSelected={''}
      optionFont={ts.font}
      optionScale={ts.scale}
      optionAlign={'center'}
    >
      {options.map(o => (
        <PrimitiveForm.Option value={o.value} label={o.label} flexGrow={1} flexShrink={1} height={segmentHeight} />
      ))}
    </PrimitiveForm.InlineSelect>
  );

  return labeledColumn(label, enabled, { flex, width }, control);
}
