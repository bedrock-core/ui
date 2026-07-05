import { createContext } from '../../core/fabric/context';
import { ModalValue } from '../../core/types';
import { FunctionComponent, JSX } from '../../jsx';
import { FormButton, type FormButtonProps } from './FormButton';
import { FormDropdown, type FormDropdownProps } from './FormDropdown';
import { FormInlineSelect, type FormInlineSelectProps } from './FormInlineSelect';
import { FormInput, type FormInputProps } from './FormInput';
import { FormOption, type FormOptionProps } from './FormOption';
import { FormSlider, type FormSliderProps } from './FormSlider';
import { FormToggle, type FormToggleProps } from './FormToggle';

/**
 * The host `type` string emitted by {@link Form}. The serializer treats it as
 * transparent (no payload, children only); the presenter detects it on the built
 * tree to switch from the ActionForm backend to the native `ModalFormData` one.
 */
export const MODAL_FORM_SLOT_TYPE = 'modal-form';

/** The result object handed to {@link FormProps.onSubmit}, keyed by each control's `name`. */
export type FormValues = Record<string, ModalValue>;

/**
 * Resolved chrome + lifecycle the presenter reads off the `modal-form` node. The
 * callbacks are not primitives, so the serializer keeps them as callbacks and walks
 * the children.
 */
export interface FormConfig {
  /**
   * Called once when the player submits, with every control's value keyed by its
   * `name`. The native modal is atomic — this is the only place values arrive.
   */
  onSubmit?: (values: FormValues) => void;
  /** Called when the player dismisses the modal (X / Esc / a `Form.Button` exit). */
  onCancel?: () => void;
}

/**
 * Marks that the calling subtree is inside a `<Form>`. The restriction pass reads it
 * to enforce that modal controls only appear under a `Form` and that no `Button` /
 * nested `Form` appears within one. `null` (the default) means "not in a modal".
 */
export const ModalContext = createContext<FormConfig | null>(null);

export interface FormProps extends FormConfig {
  /**
   * Modal contents: the field declarations (`Form.Toggle` / `Form.Slider` /
   * `Form.Dropdown` / `Form.Input`), decorative nodes (`Image` / `Panel` / `Text`),
   * and the form's action buttons — exactly ONE `Form.Button type="submit"` (required)
   * and optionally one `Form.Button type="exit"`, positioned anywhere in the flow.
   * A regular `Button` is rejected.
   */
  children?: JSX.Node;
}

interface FormComponent extends FunctionComponent<FormProps> {
  Toggle: FunctionComponent<FormToggleProps>;
  Slider: FunctionComponent<FormSliderProps>;
  Dropdown: FunctionComponent<FormDropdownProps>;
  InlineSelect: FunctionComponent<FormInlineSelectProps>;
  Option: FunctionComponent<FormOptionProps>;
  Input: FunctionComponent<FormInputProps>;
  Button: FunctionComponent<FormButtonProps>;
}

/**
 * Root that switches the renderer into native modal-form mode. Its presence on the
 * rendered tree makes the presenter build one atomic `ModalFormData` (toggle / slider
 * / dropdown / text-field fields with hardcoded submit + esc) instead of the
 * all-buttons ActionForm. Values arrive once, on submit, via {@link FormConfig.onSubmit}.
 *
 * Field declarations are the `Form.*` members; a heading is authored as a `<Text>`
 * (the modal has no `title`/`body` prop). Exactly one `Form.Button type="submit"` is
 * required (and at most one `type="exit"`), positioned anywhere in the flow:
 *
 * ```tsx
 * <Form onSubmit={v => { v.sound; v.volume; }}>
 *   <Text>Settings</Text>
 *   <Form.Toggle   name="sound"  defaultValue={true} />
 *   <Form.Slider   name="volume" min={0} max={10} />
 *   <Form.Dropdown name="mode"   options={['A', 'B']} />
 *   <Form.Input    name="nick" />
 *   <Form.Button   type="submit" label="Save" />
 * </Form>
 * ```
 *
 * Restrictions (a runtime pass during build): a modal tree may contain only `Form.*`
 * controls and decorative nodes — no regular `Button`, no nested `<Form>`, and not
 * mixed with ActionForm-only roots. Mix the two form kinds across separate `render()`
 * calls (e.g. via navigation), never nested.
 */
const FormRoot: FunctionComponent<FormProps> = ({
  onSubmit,
  onCancel,
  children,
}: FormProps): JSX.Element => {
  const config: FormConfig = { onSubmit, onCancel };

  // Provide the config to descendants (so the restriction pass sees the modal scope)
  // and emit the transparent `modal-form` marker the presenter detects. The marker
  // carries the config so the presenter reads chrome + lifecycle without re-walking
  // providers.
  return ModalContext({
    value: config,
    children: {
      type: MODAL_FORM_SLOT_TYPE,
      props: {
        __formConfig: config,
        children,
      },
    },
  });
};

/**
 * The `Form` root plus its field-control members. Assembled with `Object.assign` so
 * the namespace shape is built structurally (no narrowing cast).
 */
export const Form: FormComponent = Object.assign(FormRoot, {
  Toggle: FormToggle,
  Slider: FormSlider,
  Dropdown: FormDropdown,
  InlineSelect: FormInlineSelect,
  Option: FormOption,
  Input: FormInput,
  Button: FormButton,
});
