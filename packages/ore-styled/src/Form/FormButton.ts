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
 * `Form.Button`. The label rides the title payload as plain text, so only the
 * variant's COLOR applies to it (§-codes travel; the RP renders the label with its
 * own fixed font — the variant's font/scale cannot reach it).
 *
 * The variant's textures are DEFAULTS, not a lock: this is a single control with no
 * wrapper, so the rest spreads AFTER them exactly like `Button` — a caller-supplied
 * `background` (or any state variant) simply wins.
 */
export function FormButton({ variant, type, label, enabled = true, ...layout }: FormButtonProps): JSX.Element {
  const v = variant ?? (type === 'submit' ? 'primary' : 'secondary');
  const def = theme.components.button.variants[v];
  const color = enabled ? def.textStyle.color : def.textStyle.disabledColor;

  return PrimitiveForm.Button({
    type,
    label: `${color}${label ?? (type === 'submit' ? 'Submit' : 'Close')}`,
    enabled,
    background: def.textures.default,
    backgroundHover: def.textures.hover,
    backgroundPressed: def.textures.pressed,
    backgroundLocked: def.textures.disabled,
    ...layout,
  });
}
