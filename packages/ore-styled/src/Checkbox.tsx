/** @jsxImportSource @bedrock-core/ui-runtime */
import type { JSX } from '@bedrock-core/ui-runtime';
import { type BooleanProps, Switch } from './Switch';
import { theme } from './tokens';

export type CheckboxProps = BooleanProps;

/**
 * A box that ticks: the box on the left, the caption after it.
 *
 * Checkbox reading order, the opposite of the switch-right {@link Toggle}. The
 * same boolean underneath — a checkbox is not a control of its own, it is a
 * square skin and a different place for the caption.
 */
export function Checkbox(props: CheckboxProps): JSX.Element {
  const c = theme.components.checkbox;

  return Switch(props, {
    width: c.size,
    height: c.size,
    caption: 'after',
    gap: c.gap,
    faces: {
      background: c.textures.unchecked,
      backgroundHover: c.textures.uncheckedHover,
      backgroundLocked: c.textures.uncheckedDisabled,
      checkedBackground: c.textures.checked,
      checkedHover: c.textures.checkedHover,
      checkedLocked: c.textures.checkedDisabled,
    },
  });
}
