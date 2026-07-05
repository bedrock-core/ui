import {
  MODAL_FORM_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE,
  MODAL_FORM_BUTTON_SLOT_TYPE,
} from '../../components/Form';
import { isElement } from '../guards';
import type { JSX } from '../../jsx';
import { ModalFormError } from '../types';

/** ActionForm-only interactive host types — illegal inside a modal `<Form>`. */
const ACTION_ONLY_INTERACTIVE_TYPES = new Set<string>(['button', 'item_renderer']);

/** All modal-only control host types — the restriction set this pass enforces. */
const MODAL_CONTROL_TYPE_SET = new Set<string>([
  MODAL_TOGGLE_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE,
  MODAL_INPUT_SLOT_TYPE,
  MODAL_FORM_BUTTON_SLOT_TYPE,
]);

/**
 * Enforce the modal-form restrictions on a built tree. This is the runtime backstop
 * behind the type-level guards on `<Form>`; it catches dynamically-built or
 * type-escaped trees before the presenter picks a backend.
 *
 * Rules:
 *  - A modal-only control (`Form.Toggle`/`Slider`/`Dropdown`/`Input`) must live inside
 *    a `<Form>`.
 *  - Inside a `<Form>`: no ActionForm-only interactive control (`Button`,
 *    `ItemRenderer`) and no nested `<Form>`.
 *  - A tree may not mix a `<Form>` with ActionForm-only interactive roots, which the
 *    "no Button inside Form" rule already covers — anything interactive in a modal
 *    tree is under the Form scope by construction (the Form marker is at the root).
 *
 * @throws ModalFormError on any violation.
 */
export function validateForm(tree: JSX.Element): void {
  walk(tree, false);
}

function walk(node: JSX.Node, insideModal: boolean): void {
  if (!isElement(node)) {
    return;
  }

  const type = node.type;

  if (typeof type === 'string') {
    if (type === MODAL_FORM_SLOT_TYPE) {
      if (insideModal) {
        throw new ModalFormError(
          'A `<Form>` cannot be nested inside another `<Form>`. A screen renders a '
          + 'single modal; compose multiple forms across separate render() calls '
          + '(e.g. via navigation) instead of nesting them.',
        );
      }

      // Enter modal scope for the subtree.
      visitChildren(node, true);

      return;
    }

    if (insideModal && ACTION_ONLY_INTERACTIVE_TYPES.has(type)) {
      throw new ModalFormError(
        `\`${describe(type)}\` is not allowed inside a \`<Form>\`. A modal form accepts only `
        + 'the Form.* field controls (Toggle/Slider/Dropdown/Input) plus decorative nodes '
        + '(Image/Panel/Text); its only buttons are the hardcoded submit + esc, surfaced as '
        + 'Form\'s onSubmit / onCancel.',
      );
    }

    if (!insideModal && MODAL_CONTROL_TYPE_SET.has(type)) {
      throw new ModalFormError(
        `\`${describe(type)}\` is a modal-only control and must be rendered inside a \`<Form>\`. `
        + 'For an ActionForm screen use the standard Button / Input / Slider / Dropdown components.',
      );
    }
  }

  visitChildren(node, insideModal);
}

function visitChildren(node: JSX.Element, insideModal: boolean): void {
  const { children } = node.props;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    walk(child, insideModal);
  }
}

/** Map an internal host type to a friendlier component name for error messages. */
function describe(type: string): string {
  switch (type) {
    case 'button': return 'Button';
    case 'item_renderer': return 'ItemRenderer';
    case 'modal-toggle': return 'Form.Toggle';
    case 'modal-slider': return 'Form.Slider';
    case 'modal-dropdown': return 'Form.Dropdown';
    case 'modal-inline-select': return 'Form.Radio / Form.ToggleButton';
    case 'modal-input': return 'Form.Input';
    case 'modal-form-button': return 'Form.Button';
    default: return type;
  }
}
