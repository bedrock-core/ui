/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInlineSelectProps as PrimitiveInlineSelectProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

export interface FormRadioProps extends Omit<PrimitiveInlineSelectProps,
  'orientation' | 'optionBackground' | 'optionHover' | 'optionSelected'
  | 'bullet' | 'bulletSelected' | 'optionFont' | 'optionScale' | 'optionAlign' | 'optionHeight'> {
  /** Caption rendered above the group. */
  label?: string;
}

/** Radio row height (px): tall enough to seat the bullet glyph + label comfortably. */
const RADIO_ROW_HEIGHT = 17;

/**
 * Ore-styled modal radio group: a single-select over `options`, rendered INLINE (all options
 * always visible) on the native inline-select control. Each row is the theme radio bullet
 * (filled when selected, empty otherwise) + its label, stacked vertically — the same look as the
 * ActionForm `Radio`. `onSubmit` reports the selected option's INDEX (native behavior).
 *
 * The row backgrounds are transparent — the bullet carries the visual, exactly like the ActionForm
 * control. Labels ride each option's native blob (fixed per option), so no live current-value
 * label is needed.
 */
export function FormRadio({ label, name, options, defaultValue, enabled = true, ...layout }: FormRadioProps): JSX.Element {
  const r = theme.components.radio;
  const s = theme.components.form.labelStyle;

  const control = (
    <PrimitiveForm.InlineSelect
      name={name}
      options={options}
      defaultValue={defaultValue}
      enabled={enabled}
      orientation={'vertical'}
      optionHeight={RADIO_ROW_HEIGHT}
      optionAlign={'left'}
      // Transparent row faces — the bullet is the whole visual.
      optionBackground={''}
      optionHover={''}
      optionSelected={''}
      bullet={r.textures.unselected}
      bulletSelected={r.textures.selected}
      optionFont={s.font}
      optionScale={s.scale}
      {...(label === undefined ? layout : {})}
    />
  );

  return labeledColumn(label, enabled, layout, control);
}
