import type { FormProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { FormButton } from './FormButton';

/**
 * The native modal root, themed: the runtime `<Form>` unchanged — config,
 * `onSubmit`, `onCancel` — with the submit button this layer styles.
 *
 * The FIELDS are not members of it. `Toggle`, `Checkbox`, `Radio`,
 * `ToggleButtonGroup`, `Slider`, `Dropdown` and `Input` each serve every host
 * they can be drawn on, so each is written once and imported by its own name;
 * inside a `<Form>` they become the engine's own fields, and outside one they
 * become whatever that screen offers, or say so at build.
 */
function FormRoot(props: FormProps): JSX.Element {
  return PrimitiveForm(props);
}

export const Form = Object.assign(FormRoot, { Button: FormButton });

export type { FormProps };
