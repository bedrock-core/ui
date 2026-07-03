/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInputProps as PrimitiveFormInputProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

export interface FormInputProps extends Omit<PrimitiveFormInputProps,
  'background' | 'backgroundHover' | 'backgroundPressed' | 'backgroundLocked'> {
  /** Caption rendered above the field. */
  label?: string;
}

/**
 * Ore-styled modal text field: the theme's field-box faces on the native
 * `Form.Input`. There is no dedicated focused-state texture, so the pressed
 * (selected) face reuses hover — same rule as the ActionForm-side `Input`.
 */
export function FormInput({ label, name, placeholder, defaultValue, enabled = true, ...layout }: FormInputProps): JSX.Element {
  const t = theme.components.field.textures;

  const control = (
    <PrimitiveForm.Input
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      enabled={enabled}
      background={t.background}
      backgroundHover={t.backgroundHover}
      backgroundPressed={t.backgroundHover}
      backgroundLocked={t.backgroundDisabled}
      {...(label === undefined ? layout : { width: '100%' })}
    />
  );

  return labeledColumn(label, enabled, layout, control);
}
