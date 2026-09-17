import type { UiEvent } from '../../core/events';
import { createContext } from '../../core/fabric/context';
import { isElement } from '../../core/guards';
import { HostContext } from '../../core/hostContext';
import { MODAL_FORM_SLOT_TYPE } from '../../core/roots';
import { ModalValue } from '../../core/types';
import { FunctionComponent, JSX } from '../../jsx';
import { FormButton, type FormButtonProps } from './FormButton';

/**
 * The host `type` string emitted by {@link Form}. It carries no geometry of its
 * own — the children are the screen — and it is the root that names the modal
 * host, so a screen built on it compiles to a native `ModalFormData`.
 */
export { MODAL_FORM_SLOT_TYPE };

/**
 * The result object handed to {@link FormProps.onSubmit}, keyed by each control's `name`.
 * A multiple select answers with the indices of the options that are on.
 */
export type FormValues = Record<string, ModalValue | number[]>;

/** A submitted form: every control's value keyed by its `name`, and who submitted. */
export interface SubmitEvent extends UiEvent {
  readonly values: FormValues;
}

/**
 * Resolved chrome + lifecycle carried on the `modal-form` node: the build reads
 * the chrome, and the runtime holds the callbacks to call when the native form
 * comes back.
 */
export interface FormConfig {
  /**
   * Called once when the player submits, with every control's value keyed by
   * its `name` in `event.values`. The native modal is atomic — this is the only
   * place values arrive.
   */
  onSubmit?: (event: SubmitEvent) => void;
  /** Called when the player dismisses the modal (X / Esc / a `Form.Button` exit). */
  onCancel?: (event: UiEvent) => void;
}

/**
 * Marks that the calling subtree is inside a `<Form>`. The restriction pass reads it
 * to enforce that modal controls only appear under a `Form` and that no `Button` /
 * nested `Form` appears within one. `null` (the default) means "not in a modal".
 */
export const ModalContext = createContext<FormConfig | null>(null);

export interface FormProps extends FormConfig {
  /**
   * Modal contents: the fields (`Toggle` / `Select` / `Slider` / `Dropdown` /
   * `Input`), decorative nodes (`Image` / `Panel` / `Text`),
   * and the form's action buttons — exactly ONE `Form.Button type="submit"` (required)
   * and optionally one `Form.Button type="exit"`, positioned anywhere in the flow.
   * A regular `Button` is rejected.
   */
  children?: JSX.Node;
}

interface FormComponent extends FunctionComponent<FormProps> {
  /** The modal's own submit (`type="submit"`) and dismiss (`type="exit"`) buttons. */
  Button: FunctionComponent<FormButtonProps>;
}

/**
 * Root that switches the renderer into native modal-form mode. Its presence on the
 * rendered tree makes the presenter build one atomic `ModalFormData` (toggle / slider
 * / dropdown / text-field fields with hardcoded submit + esc) instead of the
 * all-buttons ActionForm. Values arrive once, on submit, via {@link FormConfig.onSubmit}.
 *
 * Fields are the top-level `Toggle`, `Select`, `Slider`, `Dropdown` and `Input`; a heading is authored as a `<Text>`
 * (the modal has no `title`/`body` prop). Exactly one `Form.Button type="submit"` is
 * required (and at most one `type="exit"`), positioned anywhere in the flow:
 *
 * ```tsx
 * <Form onSubmit={v => { v.sound; v.volume; }}>
 *   <Text>Settings</Text>
 *   <Toggle      name="sound"  defaultValue={true} />
 *   <Slider      name="volume" min={0} max={10} />
 *   <Input       name="nick" />
 *   <Form.Button type="submit">Save</Form.Button>
 * </Form>
 * ```
 *
 * Restrictions (a runtime pass during build): a modal tree may contain only fields,
 * `Form.Button` and decorative nodes — no regular `Button`, no nested `<Form>`, and not
 * mixed with ActionForm-only roots. Mix the two form kinds across separate `render()`
 * calls (e.g. via navigation), never nested.
 */
const FormRoot: FunctionComponent<FormProps> = ({
  onSubmit,
  onCancel,
  children,
}: FormProps): JSX.Element => {
  const config: FormConfig = { onSubmit, onCancel };

  // Provide the host (so every component below lowers to a native field) and the
  // config (so the restriction pass sees the modal scope), then emit the
  // transparent `modal-form` marker the presenter detects. The marker carries the
  // config so the presenter reads chrome + lifecycle without re-walking providers.
  return HostContext({
    value: 'form-modal',
    children: ModalContext({
      value: config,
      children: {
        type: MODAL_FORM_SLOT_TYPE,
        props: {
          __formConfig: config,
          children,
        },
      },
    }),
  });
};

/** The `Form` root with its one member, `Form.Button`. */
export const Form: FormComponent = Object.assign(FormRoot, { Button: FormButton });

/**
 * The `<Form>` marker on a built tree and the config it carries, or `undefined`
 * when the tree is an ordinary ActionForm tree. What makes a screen a modal
 * lives with the component that makes it one, so the host registry and the
 * presenter read the same answer.
 *
 * The marker is transparent, so it sits a couple of provider levels below the
 * root — walk children until it is found.
 *
 * @param node - Tree node to search from, typically the built root.
 */
export function findModalConfig(node: JSX.Node): FormConfig | undefined {
  if (!isElement(node)) {
    return undefined;
  }

  if (node.type === MODAL_FORM_SLOT_TYPE) {
    const config = node.props.__formConfig;

    // __formConfig is always a FormConfig (set by <Form>); narrow the unknown prop.
    return config && typeof config === 'object' ? config : undefined;
  }

  const { children } = node.props;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    const found = findModalConfig(child);

    if (found) {
      return found;
    }
  }

  return undefined;
}
