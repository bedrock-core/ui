/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInlineSelectProps as PrimitiveInlineSelectProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

export interface FormToggleButtonProps extends Omit<PrimitiveInlineSelectProps,
  'orientation' | 'optionBackground' | 'optionHover' | 'optionSelected'
  | 'bullet' | 'bulletSelected' | 'optionFont' | 'optionScale' | 'optionAlign' | 'optionHeight'> {
  /** Caption rendered above the group. */
  label?: string;
}

/**
 * Ore-styled modal toggle-button group: a single-select over `options`, rendered INLINE as
 * side-by-side segments on the native inline-select control — the same look as the ActionForm
 * `ToggleButtonGroup`. Each segment sizes to its label + padding; the selected segment uses the
 * pressed face. `onSubmit` reports the selected option's INDEX (native behavior).
 *
 * Segment labels ride each option's native blob (fixed per option), centered, in the theme's
 * segmented text style.
 */
export function FormToggleButton({ label, name, options, defaultValue, enabled = true, ...layout }: FormToggleButtonProps): JSX.Element {
  const tb = theme.components.toggleButton;
  const ts = tb.textStyle.selected;

  const control = (
    <PrimitiveForm.InlineSelect
      name={name}
      options={options}
      defaultValue={defaultValue}
      enabled={enabled}
      orientation={'horizontal'}
      optionHeight={tb.height}
      optionAlign={'center'}
      optionBackground={tb.textures.normal}
      optionHover={tb.textures.hover}
      optionSelected={tb.textures.pressed}
      // Segmented skin draws no bullet — the segment face is the whole visual.
      bullet={''}
      bulletSelected={''}
      optionFont={ts.font}
      optionScale={ts.scale}
      {...(label === undefined ? layout : {})}
    />
  );

  return labeledColumn(label, enabled, layout, control);
}
