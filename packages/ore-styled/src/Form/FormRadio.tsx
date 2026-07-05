/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FlexSize, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

/** One radio option: a stable `value` + its shown `label`. */
export interface FormRadioOption {
  value: string;
  label: string;
}

export interface FormRadioProps {
  /** Result key — the selected option's INDEX arrives at `values[name]` in `Form.onSubmit`. */
  name: string;
  /** The options, top to bottom. */
  options: FormRadioOption[];
  /** Initial selected value (matched to its index). Defaults to the first option. */
  defaultValue?: string;
  /** Whether the group is interactive. */
  enabled?: boolean;
  /** Caption rendered above the group. */
  label?: string;
  /** Row height per option (px). */
  rowHeight?: number;
  /** Gap between rows (px). */
  gap?: number;
  /** Layout props for the group container (flex/width/…). */
  flex?: number;
  width?: FlexSize;
}

/**
 * Ore-styled modal radio group: a single-select rendered INLINE (all options visible), each a
 * bullet glyph (filled = selected) + label, stacked vertically — the same look as the ActionForm
 * `Radio`. `onSubmit` reports the selected option's INDEX.
 *
 * Options are laid out by OUR flex system as `Form.Option` children (one per row), so the row
 * geometry is fully ours: change `rowHeight`/`gap`/the column layout here and the in-game layout
 * follows with no JSON-UI edit. Row backgrounds are transparent — the bullet carries the visual.
 */
export function FormRadio({
  name, options, defaultValue, enabled = true, label,
  rowHeight = 17, gap = 2, flex, width,
}: FormRadioProps): JSX.Element {
  const r = theme.components.radio;
  const s = theme.components.form.labelStyle;

  const control = (
    <PrimitiveForm.InlineSelect
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      flexDirection={'column'}
      gap={gap}
      {...(label === undefined ? { flex, width } : { width: '100%' })}
      // Group-level option defaults (each Form.Option inherits these).
      optionBackground={''}
      optionHover={''}
      optionSelected={''}
      bullet={r.textures.unselected}
      bulletSelected={r.textures.selected}
      bulletWidth={r.size}
      bulletHeight={r.size}
      optionFont={s.font}
      optionScale={s.scale}
      optionAlign={'left'}
    >
      {options.map(o => (
        <PrimitiveForm.Option value={o.value} label={o.label} width={'100%'} height={rowHeight} />
      ))}
    </PrimitiveForm.InlineSelect>
  );

  return labeledColumn(label, enabled, { flex, width }, control);
}
