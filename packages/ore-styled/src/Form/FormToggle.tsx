/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FormToggleProps as PrimitiveFormToggleProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm, Panel } from '@bedrock-core/ui-runtime';
import { theme } from '../tokens';
import { fieldLabel, rowSizing } from './label';

export interface FormToggleProps extends PrimitiveFormToggleProps {
  /** Settings-row caption: label on the left, the switch pinned to the right. */
  label?: string;
}

/**
 * Ore-styled modal toggle: the theme's on/off switch faces on the native
 * `Form.Toggle`, at the switch's fixed size. With a `label` it renders as a
 * settings row (caption left, switch right); without one it is the bare switch.
 *
 * The texture props are the theme's DEFAULTS, not a lock: pass any of them and yours
 * wins for that state (same rule as the non-form components). They are destructured
 * out of the layout rest on purpose — a labeled toggle is a wrapper row plus the
 * switch, and the surfaces belong to the SWITCH, never to the row panel.
 */
export function FormToggle({
  label, name, defaultValue, enabled = true,
  background, backgroundHover, backgroundPressed, backgroundLocked,
  checkedBackground, checkedHover, checkedLocked,
  ...layout
}: FormToggleProps): JSX.Element {
  const t = theme.components.toggle;

  const control = (
    <PrimitiveForm.Toggle
      name={name}
      defaultValue={defaultValue}
      enabled={enabled}
      width={t.width}
      height={t.height}
      background={background ?? t.textures.off}
      backgroundHover={backgroundHover ?? t.textures.offHover}
      backgroundPressed={backgroundPressed}
      backgroundLocked={backgroundLocked ?? t.textures.offDisabled}
      checkedBackground={checkedBackground ?? t.textures.on}
      checkedHover={checkedHover ?? t.textures.onHover}
      checkedLocked={checkedLocked ?? t.textures.onDisabled}
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
