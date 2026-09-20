import type { FormButtonProps as PrimitiveFormButtonProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import type { ButtonVariant } from '../Button';
import { theme } from '../tokens';

export interface FormButtonProps extends PrimitiveFormButtonProps {
  /** Visual style. Defaults to `'primary'` for submit and `'secondary'` for exit. */
  variant?: ButtonVariant;
}

/**
 * Ore-styled form action button: the theme's button-variant faces on the native
 * `Form.Button`. A `label` is a literal drawn in the variant's colour; children
 * are laid out inside the button as they are, so a caption the client resolves
 * — a `<Text>` holding a key — is written as one, coloured by `color`.
 *
 * The variant's textures are DEFAULTS, not a lock: this is a single control with no
 * wrapper, so the rest spreads AFTER them exactly like `Button` — a caller-supplied
 * `background` (or any state variant) simply wins.
 */
export function FormButton({ variant, type, label, children, enabled = true, ...layout }: FormButtonProps): JSX.Element {
  const v = variant ?? (type === 'submit' ? 'primary' : 'secondary');
  const def = theme.components.button.variants[v];
  const color = enabled ? def.textStyle.color : def.textStyle.disabledColor;

  return PrimitiveForm.Button({
    type,
    ...children === undefined
      ? { label: `${color}${label ?? (type === 'submit' ? 'Submit' : 'Close')}` }
      : { children },
    enabled,
    background: def.textures.default,
    backgroundHover: def.textures.hover,
    backgroundPressed: def.textures.pressed,
    backgroundLocked: def.textures.disabled,
    ...layout,
  });
}
