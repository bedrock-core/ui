/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInlineSelectProps as PrimitiveFormInlineSelectProps, JSX, Spacing } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

/** One radio option: a stable `value` + its shown `label`. */
export interface FormRadioOption {
  value: string;
  label: string;
}

export interface FormRadioProps extends Omit<PrimitiveFormInlineSelectProps, 'children'> {
  // `children` is the one NON-appearance omission: the ore layer owns the option children,
  // building them from the `options` array below (same deal as `Form.Dropdown`), so a
  // caller-supplied child could only fight the array. Nothing else collides — the primitive
  // authors its options as CHILDREN and has no `options` prop of its own, so the ore-shaped
  // `options` below is additive, not an override.
  /** The options, top to bottom. */
  options: FormRadioOption[];
  /** Caption rendered above the group. */
  label?: string;
  /** Row height per option (px). */
  rowHeight?: number;
  /** Gap between rows. Defaults to `2` px. */
  gap?: Spacing;
}

/**
 * Ore-styled modal radio group: a single-select rendered INLINE (all options visible), each a
 * bullet glyph (filled = selected) + label, stacked vertically — the same look as the ActionForm
 * `Radio`. `onSubmit` reports the selected option's INDEX.
 *
 * Options are laid out by OUR flex system as `Form.Option` children (one per row), so the row
 * geometry is fully ours: change `rowHeight`/`gap`/the column layout here and the in-game layout
 * follows with no JSON-UI edit. Row backgrounds are transparent — the bullet carries the visual.
 *
 * Every appearance prop is the theme's DEFAULT, not a lock: pass any of them and yours wins
 * (same rule as the non-form components). Note the transparent row faces are themselves the
 * themed value — `optionBackground` and friends fall back to the EMPTY string on purpose, so
 * an untouched group stays bullet-only. Appearance props (and `gap`, which spaces the ROWS)
 * are destructured out of the layout rest on purpose — a labeled group is a wrapper column
 * plus the select, and they belong to the SELECT, never to the column panel.
 */
export function FormRadio({
  name, options, defaultValue, enabled = true, label,
  rowHeight = 17, gap = 2, background,
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
  optionFont, optionScale, optionAlign,
  ...layout
}: FormRadioProps): JSX.Element {
  const r = theme.components.radio;
  const s = theme.components.form.labelStyle;

  const control = (
    <PrimitiveForm.InlineSelect
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      background={background}
      flexDirection={'column'}
      gap={gap}
      {...(label === undefined ? layout : { width: '100%' })}
      // Group-level option defaults (each Form.Option inherits these).
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
        <PrimitiveForm.Option value={o.value} label={o.label} width={'100%'} height={rowHeight} />
      ))}
    </PrimitiveForm.InlineSelect>
  );

  return labeledColumn(label, enabled, layout, control);
}
