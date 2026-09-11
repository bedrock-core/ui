import type { RawMessage } from '@minecraft/server';
import type { ModalFormData } from '@minecraft/server-ui';
import { isModalContext } from './guards';
import type { FormTarget, SerializationContext } from './types';

/**
 * The typed calls a modal's fields are made with.
 *
 * A modal's fields are the ENGINE's, not the pack's: each one exists because a
 * `ModalFormData` method was called, and these are those calls. Every emitter
 * owns the ordinal → `name` bookkeeping, so the positional `response.formValues`
 * can be fanned back out by name, and takes its native args (min/max/options/…)
 * as direct arguments rather than through the payload — which is primitives
 * only, and could not carry a dropdown's option array at all.
 *
 * {@link emitLabel} is the odd one: a label consumes a `formValues` slot of its
 * own (the engine returns `null` there), so it has to advance the ordinal
 * without claiming a name. A compiled modal uses it for the rows that carry a
 * value rather than a field — live text, a carried visible, a list's count.
 */

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
export function emitLabel(payload: string | RawMessage, form: FormTarget, ctx?: SerializationContext): void {
  if (ctx && isModalContext(ctx)) {
    ctx.modalControlIndex++;
  }

  form.label(payload);
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
  payload: string | RawMessage,
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
  payload: string | RawMessage,
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
  payload: string | RawMessage,
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
  payload: string | RawMessage,
  form: ModalFormData,
  ctx: SerializationContext | undefined,
  name: string,
  placeholder: string,
  defaultValue: string,
): void {
  recordModalOrdinal(ctx, name);
  form.textField(payload, placeholder, { defaultValue });
}
