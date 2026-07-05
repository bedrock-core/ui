import { FunctionComponent, JSX } from '../../jsx';
import { isElement } from '../../core/guards';
import { ModalFormError, type SerializableProps, type Writer } from '../../core/types';
import { resolveStateBackgrounds, withControl, type ControlProps, type StateBackgroundProps } from '../control';

/** Which form action the button triggers. */
/**
 * Host type for `Form.Button` — NOT a native control: it consumes no `formValues` slot;
 * its payload rides the form TITLE (assembled by the presenter post-layout).
 */
export const MODAL_FORM_BUTTON_SLOT_TYPE = 'modal-form-button';

export type FormButtonKind = 'submit' | 'exit';

export interface FormButtonProps extends ControlProps, StateBackgroundProps {
  /**
   * `'submit'` presses the native submit (values return via `Form.onSubmit`);
   * `'exit'` closes the form like Esc (`Form.onCancel`, no values). A form must
   * declare exactly ONE submit button and at most one exit button.
   */
  type: FormButtonKind;
  /** Button text. Defaults to `'Submit'` / `'Close'` by kind. */
  label?: string;
}

/**
 * JSON UI feeds a label's `text` through a numeric string-format path, so a value
 * starting with a digit (or `-`) renders blank/garbled. A zero-width `§r` shifts the
 * leading character off the digit without changing what's shown.
 */
function safeLabelText(text: string): string {
  return /^[\d-]/.test(text) ? `§r${text}` : text;
}

/**
 * A form action button, positioned in the scroll flow like any other row. It is NOT
 * a native modal control (no factory entry, no `formValues` slot): the presenter
 * collects these post-layout and encodes their geometry + styling into the form
 * TITLE payload (after the scroll block), where the RP renders and wires them to
 * the engine's submit / close button ids.
 *
 * Layout defaults mirror the field controls: full row width, native row height.
 */
export const FormButton: FunctionComponent<FormButtonProps> = ({
  type, label,
  backgroundHover, backgroundPressed, backgroundLocked, ...layout
}: FormButtonProps): JSX.Element => {
  const states = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  // Default to filling the row ONLY when the caller gave no sizing at all — an
  // explicit width OR any flex sizing must win (a width default would pin the
  // flex-basis and break flex distribution in row panels).
  const sized = layout.width !== undefined || layout.flex !== undefined
    || layout.flexGrow !== undefined || layout.flexBasis !== undefined;

  return {
    type: MODAL_FORM_BUTTON_SLOT_TYPE,
    props: {
      // withControl so the layout phase computes jsonUIx/y/Width/Height like any control.
      ...withControl({ ...(sized ? {} : { width: '100%' }), ...layout, background: states.background }),
      backgroundHover: states.backgroundHover,
      backgroundPressed: states.backgroundPressed,
      backgroundLocked: states.backgroundLocked,
      buttonKind: type,
      label: safeLabelText(label ?? (type === 'submit' ? 'Submit' : 'Close')),
    },
  };
};

/**
 * No-op writer: the button is not a native modal control — it consumes NO
 * `ModalFormData` entry and NO `formValues` slot. Its payload rides the form
 * title, assembled by the presenter from the laid-out tree.
 */
export const formButtonWriter: Writer = () => {
  // intentionally empty
};

/**
 * Collect the form's `Form.Button` ELEMENTS from the laid-out tree and enforce the
 * cardinality rules: exactly one submit (required — the modal has no built-in
 * submit), at most one exit. Component-owned, like the writer: the component
 * module knows its own rules and serialized shape.
 *
 * @throws ModalFormError on a missing submit or a duplicate of either kind.
 */
export function collectFormButtons(tree: JSX.Element): { submit: JSX.Element; exit?: JSX.Element } {
  const found: { submit?: JSX.Element; exit?: JSX.Element } = {};

  walkButtons(tree, found);

  if (!found.submit) {
    throw new ModalFormError(
      'A <Form> must declare exactly one `Form.Button type="submit"` — the modal has no '
      + 'built-in submit button; place it anywhere in the form flow.',
    );
  }

  return { submit: found.submit, exit: found.exit };
}

function walkButtons(node: JSX.Node, found: { submit?: JSX.Element; exit?: JSX.Element }): void {
  if (Array.isArray(node)) {
    node.forEach(child => walkButtons(child, found));

    return;
  }

  if (!isElement(node)) {
    return;
  }

  if (node.type === MODAL_FORM_BUTTON_SLOT_TYPE) {
    const kind = node.props.buttonKind === 'exit' ? 'exit' : 'submit';

    if (found[kind]) {
      throw new ModalFormError(
        `A <Form> may declare at most ONE \`Form.Button type="${kind}"\` — found a second one. `
        + 'The RP renders a single control per kind from the title payload.',
      );
    }

    found[kind] = node;
  }

  walkButtons(node.props.children, found);
}

/**
 * The button's serialized TITLE fields, in contract order: width, height, x, y
 * (layout-computed), visible, enabled, label, background/hover/pressed/locked.
 * An UNDECLARED button (element `undefined`) yields its absent-state defaults —
 * hidden, zero geometry, empty strings — so both blocks always serialize and the
 * title offsets stay fixed. The absolute offsets are locked by the modal title
 * offset-contract test and decoded by modal_container.json.
 *
 * @param prefix - Field-name prefix (`'submit'` / `'exit'`), also the block order.
 * @param element - The laid-out `Form.Button` element, or undefined when undeclared.
 */
export function formButtonTitleFields(prefix: FormButtonKind, element?: JSX.Element): SerializableProps {
  const props = element?.props;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');

  return {
    [`${prefix}W`]: num(props?.jsonUIWidth),
    [`${prefix}H`]: num(props?.jsonUIHeight),
    [`${prefix}X`]: num(props?.jsonUIx),
    [`${prefix}Y`]: num(props?.jsonUIy),
    [`${prefix}Visible`]: element !== undefined && props?.visible !== false,
    [`${prefix}Enabled`]: element !== undefined && props?.enabled !== false,
    [`${prefix}Label`]: str(props?.label),
    [`${prefix}Bg`]: str(props?.background),
    [`${prefix}Hover`]: str(props?.backgroundHover),
    [`${prefix}Pressed`]: str(props?.backgroundPressed),
    [`${prefix}Locked`]: str(props?.backgroundLocked),
  };
}
