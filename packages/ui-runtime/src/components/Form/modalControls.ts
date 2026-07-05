import type { ModalFormData } from '@minecraft/server-ui';

/**
 * Host `type` strings for the native modal controls. Each is registered with its own
 * writer (co-located with its component, like `buttonWriter`/`panelWriter`). They are
 * only valid inside a `<Form>`; the restriction pass rejects them elsewhere.
 */
export const MODAL_TOGGLE_SLOT_TYPE = 'modal-toggle';
export const MODAL_SLIDER_SLOT_TYPE = 'modal-slider';
export const MODAL_DROPDOWN_SLOT_TYPE = 'modal-dropdown';
/**
 * Inline single-select (radio group / toggle-button group) → native `ModalFormData.dropdown`,
 * but the RP renders its option collection INLINE in the form flow (all options always visible)
 * instead of behind the dropdown popup. Each option is a `Form.Option` child laid out by OUR
 * flex system; the writer packs every option's computed geometry (x/y/w/h) into its blob so the
 * RP option row self-positions via `use_anchored_offset` — no engine flow layout.
 */
export const MODAL_INLINE_SELECT_SLOT_TYPE = 'modal-inline-select';
/**
 * `Form.Option` — a single inline-select option. LAYOUT-ONLY: the flex engine lays it out (so it
 * gets computed x/y/w/h like any element), but the serializer does NOT emit it as a native
 * control — its geometry + text are read by the inline-select writer and packed into the native
 * option blob. Skipped by the serialize walk (see serializer.ts).
 */
export const MODAL_OPTION_SLOT_TYPE = 'modal-option';
export const MODAL_INPUT_SLOT_TYPE = 'modal-input';
/**
 * `Form.Button` — NOT a native control: it consumes no `formValues` slot; its
 * payload rides the form TITLE (assembled by the presenter post-layout).
 */
export const MODAL_FORM_BUTTON_SLOT_TYPE = 'modal-form-button';

/** All modal-only control host types, used by the restriction pass. */
export const MODAL_CONTROL_SLOT_TYPES = [
  MODAL_TOGGLE_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE,
  MODAL_INPUT_SLOT_TYPE,
  MODAL_FORM_BUTTON_SLOT_TYPE,
] as const;

/**
 * The function prop a modal control attaches to its host element. `build` performs
 * the typed `ModalFormData.toggle()/.slider()/…` call and owns the native arguments
 * (label, min/max, options, defaultValue, …) so non-primitive args like an options
 * array never pass through the serializer's primitive payload channel.
 *
 * There is no per-control value callback: the native modal is atomic and returns
 * every value at once on submit, which the presenter re-keys by `name` and hands to
 * `Form.onSubmit`. Controls are pure field declarations.
 */
export interface ModalControlBuild {
  build: (form: ModalFormData) => void;
}
