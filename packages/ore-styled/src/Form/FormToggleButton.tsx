/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInlineSelectProps as PrimitiveFormInlineSelectProps, JSX, Spacing } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

/** One segment: a stable `value` + its shown `label`. */
export interface FormToggleButtonOption {
  value: string;
  label: string;
}

export interface FormToggleButtonProps extends Omit<PrimitiveFormInlineSelectProps, 'children'> {
  // `children` is the one NON-appearance omission: the ore layer owns the option children,
  // building them from the `options` array below (same deal as `Form.Dropdown`), so a
  // caller-supplied child could only fight the array. Nothing else collides — the primitive
  // authors its options as CHILDREN and has no `options` prop of its own, so the ore-shaped
  // `options` below is additive, not an override.
  /** The segments, left to right. */
  options: FormToggleButtonOption[];
  /** Caption rendered above the group. */
  label?: string;
  /** Segment height (px). */
  segmentHeight?: number;
  /** Gap between segments. Defaults to `-1` px — the 1px overlap that fuses adjacent borders. */
  gap?: Spacing;
}

/**
 * Ore-styled modal toggle-button group: a single-select rendered INLINE as side-by-side segments —
 * the same look as the ActionForm `ToggleButtonGroup`. `onSubmit` reports the selected option's
 * INDEX. The selected segment uses the pressed face.
 *
 * Segments are laid out by OUR flex system as `Form.Option` children with `flexGrow:1` (equal
 * width) and `gap:-1` (1px overlap) — exactly the non-form control's row. Change the flex here and
 * the in-game layout follows with no JSON-UI edit.
 *
 * Every appearance prop is the theme's DEFAULT, not a lock: pass any of them and yours wins
 * (same rule as the non-form components). Note the glyph-less segments are themselves the
 * themed value — `bullet`/`bulletSelected` fall back to the EMPTY string on purpose, so an
 * untouched group keeps the segmented look. `bulletHover`/`bulletSelectedHover` and the bullet
 * size are passed through raw instead, so the primitive's own `?? bullet` chain applies and a
 * caller who opts INTO a glyph gets it mirrored across the states. Appearance props (and `gap`,
 * which is the segment overlap) are destructured out of the layout rest on purpose — a labeled
 * group is a wrapper column plus the select, and they belong to the SELECT, never to the panel.
 */
export function FormToggleButton({
  name, options, defaultValue, enabled = true, label,
  segmentHeight = theme.components.toggleButton.height, gap = -1, background,
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
  optionFont, optionScale, optionAlign,
  ...layout
}: FormToggleButtonProps): JSX.Element {
  const tb = theme.components.toggleButton;
  const ts = tb.textStyle.selected;

  const control = (
    <PrimitiveForm.InlineSelect
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      background={background}
      flexDirection={'row'}
      gap={gap}
      {...(label === undefined ? layout : { width: '100%' })}
      optionBackground={optionBackground ?? tb.textures.normal}
      optionHover={optionHover ?? tb.textures.hover}
      optionSelected={optionSelected ?? tb.textures.pressed}
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
  );

  return labeledColumn(label, enabled, layout, control);
}
