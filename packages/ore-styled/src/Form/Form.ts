import type { FormProps, JSX } from '@bedrock-core/ui-runtime';
import { Form as PrimitiveForm } from '@bedrock-core/ui-runtime';
import { FormButton } from './FormButton';
import { FormCheckbox } from './FormCheckbox';
import { FormDropdown } from './FormDropdown';
import { FormInput } from './FormInput';
import { FormRadio } from './FormRadio';
import { FormSlider } from './FormSlider';
import { FormToggle } from './FormToggle';
import { FormToggleButton } from './FormToggleButton';

/**
 * Ore-styled native modal form: the runtime `<Form>` root (unchanged — config,
 * onSubmit, onCancel) with ore-styled field members, mirroring the runtime's
 * namespace shape so a form switches styled ↔ unstyled by changing only the import.
 * Every field takes a `label` (composed here — the primitives are label-free):
 * Input/Dropdown/Slider render it above the control, Toggle as a settings row.
 */
function FormRoot(props: FormProps): JSX.Element {
  return PrimitiveForm(props);
}

export const Form = Object.assign(FormRoot, {
  Toggle: FormToggle,
  Checkbox: FormCheckbox,
  Radio: FormRadio,
  ToggleButton: FormToggleButton,
  Slider: FormSlider,
  Dropdown: FormDropdown,
  Input: FormInput,
  Button: FormButton,
});

export type { FormProps };
