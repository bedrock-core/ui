/**
 * The element types the field components lower to inside a `<Form>`. A leaf, like `roots.ts`, so
 * the host contracts, the validation pass and the layout phase can name them without importing the
 * components, which import the hooks that import those contracts.
 */

/** A native modal toggle. */
export const MODAL_TOGGLE_SLOT_TYPE = 'modal-toggle';

/** A native modal slider. */
export const MODAL_SLIDER_SLOT_TYPE = 'modal-slider';

/** A native modal dropdown. */
export const MODAL_DROPDOWN_SLOT_TYPE = 'modal-dropdown';

/** A native modal text field. */
export const MODAL_INPUT_SLOT_TYPE = 'modal-input';

/** An inline select: a native dropdown drawn with every option visible. */
export const MODAL_INLINE_SELECT_SLOT_TYPE = 'modal-inline-select';

/**
 * An `Option`: laid out like any element, never a control of its own. Its parent select reads its
 * data and geometry.
 */
export const MODAL_OPTION_SLOT_TYPE = 'modal-option';
