/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormToggleProps as PrimitiveFormToggleProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, Panel } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { fieldLabel, rowSizing } from './label';

export interface FormToggleProps extends Omit<PrimitiveFormToggleProps,
  'background' | 'backgroundHover' | 'backgroundPressed' | 'backgroundLocked'
  | 'checkedBackground' | 'checkedHover' | 'checkedLocked'> {
  /** Settings-row caption: label on the left, the switch pinned to the right. */
  label?: string;
}

/**
 * Ore-styled modal toggle: the theme's on/off switch faces on the native
 * `Form.Toggle`, at the switch's fixed size. With a `label` it renders as a
 * settings row (caption left, switch right); without one it is the bare switch.
 */
export function FormToggle({ label, name, defaultValue, enabled = true, ...layout }: FormToggleProps): JSX.Element {
  const t = theme.components.toggle;

  const control = (
    <PrimitiveForm.Toggle
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      width={t.width}
      height={t.height}
      background={t.textures.off}
      backgroundHover={t.textures.offHover}
      backgroundLocked={t.textures.offDisabled}
      checkedBackground={t.textures.on}
      checkedHover={t.textures.onHover}
      checkedLocked={t.textures.onDisabled}
      {...(label === undefined ? layout : {})}
    />
  );

  if (label === undefined) {
    return control;
  }

  return (
    <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'} {...rowSizing(layout)} {...layout}>
      {fieldLabel(label, enabled)}
      {control}
    </Panel>
  );
}
