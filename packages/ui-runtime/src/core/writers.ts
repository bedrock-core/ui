import type { ModalFormData } from '@minecraft/server-ui';
import { isActionContext, isActionForm, isModalContext } from './guards';
import { ModalFormError, type FormTarget, type SerializationContext } from './types';

/**
 * Slot helpers for native component writers.
 *
 * The RP renders everything through just two ActionForm primitives:
 *   - `form.button()` → routed by `button_router` (interactive controls)
 *   - `form.label()`  → routed by `label_router` (static controls)
 *
 * A writer picks one slot in a single call. `emitButton` also owns the
 * button-index / `onPress` callback bookkeeping so every interactive writer
 * (built-in or custom) stays consistent with the presenter's selection mapping.
 *
 * Modal forms reuse the same serialize walk but emit through `ModalFormData`'s
 * typed controls. Each native control has its OWN emitter here — `emitToggle`,
 * `emitSlider`, `emitDropdown`, `emitInput` — exactly like `emitButton`/`emitLabel`
 * own the ActionForm slots. Each emitter owns the ordinal → `name` bookkeeping (so the
 * presenter can fan `response.formValues` back out) AND makes the typed native call,
 * taking its native args (min/max/options/…) as direct function arguments — so a
 * non-primitive like the dropdown's `options` array never has to pass through the
 * serializer's primitive-only payload channel. Decorative nodes (image/panel) keep using
 * `emitLabel`, which works on both form types — only the logic controls differ between
 * the two backends.
 */

type Callbacks = Record<string, (...args: unknown[]) => void>;

/**
 * Emit an interactive (button-slot) control. Registers `callbacks.onPress`
 * against the current button index, advances the index, then writes the button.
 *
 * @param payload - Serialized component payload.
 * @param form - Target form.
 * @param ctx - Serialization context tracking the button index → callback map.
 * @param callbacks - Function props collected for this element (e.g. `onPress`).
 * @param icon - Optional icon path passed to `form.button` (e.g. item aux id).
 */
export function emitButton(
  payload: string,
  form: FormTarget,
  ctx: SerializationContext | undefined,
  callbacks: Callbacks,
  icon?: string,
): void {
  // A real button is an ActionForm-only primitive. The modal path forbids buttons
  // (only the hardcoded submit + esc exist), so reaching here with a ModalFormData
  // means the restriction pass missed a `<Button>` — fail loud rather than crash on
  // a missing `.button()` method.
  if (!isActionForm(form)) {
    throw new ModalFormError(
      'emitButton(): a button-slot control reached the modal form path. Modal forms '
      + 'accept only toggle/slider/dropdown/input/label plus the hardcoded submit/esc '
      + 'buttons — move interactive `Button`s out of the `<ModalForm>`.',
    );
  }

  if (ctx && isActionContext(ctx)) {
    if (callbacks.onPress) {
      ctx.buttonCallbacks.set(ctx.buttonIndex, callbacks.onPress);
    }

    ctx.buttonIndex++;
  }

  form.button(payload, icon);
}

/**
 * Emit a static (label-slot) control. `label()` exists on both `ActionFormData`
 * and `ModalFormData`, so decorative nodes share this writer across both backends.
 *
 * On the native modal, `form.label()` ALSO consumes a `response.formValues` slot
 * (the engine returns `null` there) — confirmed empirically: a form with decorative
 * `<Panel>` wrappers among its fields returned a `formValues` array 1 entry longer
 * per label, with every later control's value shifted by that many slots. So a modal
 * label must advance `modalControlIndex` WITHOUT registering a `ModalControlEntry`
 * (an empty name skips it in `collectValues`'s re-keying) to keep every later
 * control's recorded ordinal aligned with its real position in `formValues`.
 *
 * @param payload - Serialized component payload.
 * @param form - Target form.
 * @param ctx - Serialization context; advances the modal ordinal when present.
 */
export function emitLabel(payload: string, form: FormTarget, ctx?: SerializationContext): void {
  if (ctx && isModalContext(ctx)) {
    ctx.modalControlIndex++;
  }

  form.label(payload);
}

/**
 * Emit a static control through the ActionForm HEADER slot. The native factory routes
 * header entries to their own control_id, so a header-slot cell instantiates ONLY the
 * slim `header_router` (one component variant) instead of the full label_router variant
 * fan-out — engine-level type routing, no `#type` gating cost at all. Used for `image`.
 *
 * On the modal backend this falls back to the label slot: modal headers' payload
 * channel + formValues behavior are unproven, while modal labels are (see emitLabel).
 */
export function emitHeader(payload: string, form: FormTarget, ctx?: SerializationContext): void {
  if (!isActionForm(form)) {
    emitLabel(payload, form, ctx);

    return;
  }

  form.header(payload);
}

/**
 * Record a native modal control's `name` against its ordinal, then advance the ordinal
 * counter. Shared bookkeeping for the four modal-control emitters below: it lets the
 * presenter re-key the positional `response.formValues[ordinal]` into the named result
 * after submit.
 *
 * Modal controls are field DECLARATIONS: the native form fires no per-control events, so
 * there is no per-control callback — values come back only at submit, all at once, and the
 * presenter dispatches them to `Form.onSubmit`.
 *
 * The `payload` passed to each emitter is the control's OWN serialized encoding — the full
 * control block (type + layout-computed width/height/x/y/visible/enabled/region + styling)
 * produced by the same serialize+layout pass as ActionForm components. It becomes the
 * native control's label string, so the RP decodes real geometry and styling from it
 * (`use_anchored_offset` + `#size_binding_*`), exactly like the ActionForm slots.
 */
function recordModalOrdinal(ctx: SerializationContext | undefined, name: string): void {
  if (ctx && isModalContext(ctx)) {
    ctx.modalControls.set(ctx.modalControlIndex, { name });
    ctx.modalControlIndex++;
  }
}

/**
 * Emit a native modal toggle → `ModalFormData.toggle`. Records the ordinal, then makes
 * the typed call.
 *
 * Parameter order mirrors {@link emitButton} (`payload, form, ctx, …`), then this
 * control's own args.
 *
 * @param payload - The control's serialized control-block payload (native label channel).
 * @param form - Target modal form.
 * @param ctx - Serialization context tracking the modal ordinal → name registry.
 * @param name - Result key for this control (its `name` prop).
 * @param defaultValue - Initial on/off state.
 */
export function emitToggle(
  payload: string,
  form: ModalFormData,
  ctx: SerializationContext | undefined,
  name: string,
  defaultValue: boolean,
): void {
  recordModalOrdinal(ctx, name);
  form.toggle(payload, { defaultValue });
}

/**
 * Emit a native modal slider → `ModalFormData.slider`. Records the ordinal, then makes
 * the typed call.
 *
 * Parameter order mirrors {@link emitButton} (`payload, form, ctx, …`), then this
 * control's own args.
 *
 * @param payload - The control's serialized control-block payload (native label channel).
 * @param form - Target modal form.
 * @param ctx - Serialization context tracking the modal ordinal → name registry.
 * @param name - Result key for this control (its `name` prop).
 * @param min - Minimum selectable value.
 * @param max - Maximum selectable value.
 * @param defaultValue - Initial value.
 * @param valueStep - Increment between values, or `undefined` for the native default.
 */
export function emitSlider(
  payload: string,
  form: ModalFormData,
  ctx: SerializationContext | undefined,
  name: string,
  min: number,
  max: number,
  defaultValue: number,
  valueStep: number | undefined,
): void {
  recordModalOrdinal(ctx, name);
  form.slider(payload, min, max, { defaultValue, valueStep });
}

/**
 * Emit a native modal dropdown → `ModalFormData.dropdown`. Records the ordinal, then makes
 * the typed call. `options` (a non-primitive array) arrives as a direct argument, so it
 * never passes through the serializer's primitive-only payload channel.
 *
 * Parameter order mirrors {@link emitButton} (`payload, form, ctx, …`), then this
 * control's own args.
 *
 * @param payload - The control's serialized control-block payload (native label channel).
 * @param form - Target modal form.
 * @param ctx - Serialization context tracking the modal ordinal → name registry.
 * @param name - Result key for this control (its `name` prop).
 * @param options - Selectable option values.
 * @param defaultValueIndex - Initial selection as an index into `options`.
 */
export function emitDropdown(
  payload: string,
  form: ModalFormData,
  ctx: SerializationContext | undefined,
  name: string,
  options: string[],
  defaultValueIndex: number,
): void {
  recordModalOrdinal(ctx, name);
  form.dropdown(payload, options, { defaultValueIndex });
}

/**
 * Emit a native modal text field → `ModalFormData.textField`. Records the ordinal, then
 * makes the typed call.
 *
 * Parameter order mirrors {@link emitButton} (`payload, form, ctx, …`), then this
 * control's own args.
 *
 * @param payload - The control's serialized control-block payload (native label channel).
 * @param form - Target modal form.
 * @param ctx - Serialization context tracking the modal ordinal → name registry.
 * @param name - Result key for this control (its `name` prop).
 * @param placeholder - Text shown when the field is empty.
 * @param defaultValue - Initial text.
 */
export function emitInput(
  payload: string,
  form: ModalFormData,
  ctx: SerializationContext | undefined,
  name: string,
  placeholder: string,
  defaultValue: string,
): void {
  recordModalOrdinal(ctx, name);
  form.textField(payload, placeholder, { defaultValue });
}
