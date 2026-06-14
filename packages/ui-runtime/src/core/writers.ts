import type { ActionFormData } from '@minecraft/server-ui';
import type { SerializationContext } from './types';

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
  form: ActionFormData,
  ctx: SerializationContext | undefined,
  callbacks: Callbacks,
  icon?: string,
): void {
  if (ctx) {
    if (callbacks.onPress) {
      ctx.buttonCallbacks.set(ctx.buttonIndex, callbacks.onPress);
    }

    ctx.buttonIndex++;
  }

  form.button(payload, icon);
}

/**
 * Emit a static (label-slot) control.
 *
 * @param payload - Serialized component payload.
 * @param form - Target form.
 */
export function emitLabel(payload: string, form: ActionFormData): void {
  form.label(payload);
}
