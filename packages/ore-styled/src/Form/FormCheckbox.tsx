/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormToggleProps as PrimitiveFormToggleProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, Panel } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { fieldLabel, rowSizing } from './label';

export interface FormCheckboxProps extends PrimitiveFormToggleProps {
  /** Caption rendered to the RIGHT of the box (checkbox reading order). */
  label?: string;
}

/**
 * Ore-styled modal checkbox: the theme's checked/unchecked box faces on the native
 * `Form.Toggle`. A checkbox IS a boolean toggle — this is the same `modal-toggle`
 * slot as `Form.Toggle`, just skinned with the square checkbox textures; `onSubmit`
 * reports a `boolean`. With a `label` it renders as a row with the box on the LEFT
 * and the caption on the right (checkbox reading order, opposite of the switch-right
 * `Form.Toggle`); without one it is the bare box.
 *
 * The texture props are the theme's DEFAULTS, not a lock: pass any of them and yours
 * wins for that state (same rule as the non-form components). They are destructured
 * out of the layout rest on purpose — a labeled checkbox is a wrapper row plus the
 * box, and the surfaces belong to the BOX, never to the row panel.
 */
export function FormCheckbox({
  label, name, defaultValue, enabled = true,
  background, backgroundHover, backgroundPressed, backgroundLocked,
  checkedBackground, checkedHover, checkedLocked,
  ...layout
}: FormCheckboxProps): JSX.Element {
  const c = theme.components.checkbox;

  const control = (
    <PrimitiveForm.Toggle
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      width={c.size}
      height={c.size}
      background={background ?? c.textures.unchecked}
      backgroundHover={backgroundHover ?? c.textures.uncheckedHover}
      backgroundPressed={backgroundPressed}
      backgroundLocked={backgroundLocked ?? c.textures.uncheckedDisabled}
      checkedBackground={checkedBackground ?? c.textures.checked}
      checkedHover={checkedHover ?? c.textures.checkedHover}
      checkedLocked={checkedLocked ?? c.textures.checkedDisabled}
      {...(label === undefined ? layout : {})}
    />
  );

  if (label === undefined) {
    return control;
  }

  return (
    <Panel flexDirection={'row'} alignItems={'center'} gap={c.gap} {...rowSizing(layout)} {...layout}>
      {control}
      {fieldLabel(label, enabled)}
    </Panel>
  );
}
