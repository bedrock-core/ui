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
 * typed controls instead. `emitModalControl` owns the parallel ordinal /
 * `onChange` bookkeeping the presenter uses to fan `response.formValues` back out.
 * Decorative nodes (image/panel) keep using `emitLabel`, which works on both
 * form types — only the logic controls differ between the two backends.
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
 * @param payload - Serialized component payload.
 * @param form - Target form.
 */
export function emitLabel(payload: string, form: FormTarget): void {
  form.label(payload);
}

/**
 * Emit a native modal control (`ModalFormData` only): toggle, slider, dropdown or
 * text field. Records the control's `name` against its ordinal so the presenter can
 * re-key the positional `response.formValues[ordinal]` into the named result after
 * submit, then advances the ordinal counter. The `build` callback performs the actual
 * typed `form.toggle()/.slider()/…` call so each component supplies its own native
 * arguments (min/max/options/…) — including non-primitive ones like an options array,
 * which never have to pass through the serializer's primitive-only payload channel.
 *
 * Modal controls are field DECLARATIONS: the native form fires no per-control events,
 * so there is no per-control callback here — values come back only at submit, all at
 * once, and the presenter dispatches them to `Form.onSubmit`.
 *
 * @param form - Target modal form.
 * @param ctx - Serialization context tracking the modal ordinal → name registry.
 * @param name - Result key for this control (its `name` prop).
 * @param build - Performs the typed `ModalFormData` control call.
 */
export function emitModalControl(
  form: ModalFormData,
  ctx: SerializationContext | undefined,
  name: string,
  build: (form: ModalFormData) => void,
): void {
  if (ctx && isModalContext(ctx)) {
    ctx.modalControls.set(ctx.modalControlIndex, { name });
    ctx.modalControlIndex++;
  }

  build(form);
}
