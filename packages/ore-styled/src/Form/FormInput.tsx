/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormInputProps as PrimitiveFormInputProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { labeledColumn } from './label';

export interface FormInputProps extends PrimitiveFormInputProps {
  /** Caption rendered above the field. */
  label?: string;
}

/**
 * Ore-styled modal text field: the theme's field-box faces on the native
 * `Form.Input`. There is no dedicated focused-state texture, so the pressed
 * (selected) face reuses hover — same rule as the ActionForm-side `Input`.
 *
 * The texture props and the field's `font`/`scale` are the theme's DEFAULTS, not a
 * lock: pass any of them and yours wins (same rule as the non-form components). They
 * are destructured out of the layout rest on purpose — a labeled field is a wrapper
 * column plus the box, and the surfaces and text style belong to the BOX, never to
 * the column panel. The "pressed reuses hover" rule survives an override: a caller's
 * `backgroundHover` also becomes their focused face unless they set `backgroundPressed`.
 */
export function FormInput({
  label, name, placeholder, defaultValue, enabled = true,
  background, backgroundHover, backgroundPressed, backgroundLocked, font, scale,
  ...layout
}: FormInputProps): JSX.Element {
  const t = theme.components.field.textures;
  const ts = theme.components.field.textStyle;

  const control = (
    <PrimitiveForm.Input
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      enabled={enabled}
      background={background ?? t.background}
      backgroundHover={backgroundHover ?? t.backgroundHover}
      backgroundPressed={backgroundPressed ?? backgroundHover ?? t.backgroundHover}
      backgroundLocked={backgroundLocked ?? t.backgroundDisabled}
      font={font ?? ts.font}
      scale={scale ?? ts.scale}
      {...(label === undefined ? layout : { width: '100%' })}
    />
  );

  return labeledColumn(label, enabled, layout, control);
}
