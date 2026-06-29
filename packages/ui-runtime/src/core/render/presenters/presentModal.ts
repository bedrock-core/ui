import { type Player } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import type { FormConfig, FormValues } from '../../../components/Form';
import type { JSX } from '../../../jsx';
import { serialize } from '../../serializer';
import type { ModalSerializationContext } from '../../types';
import { runInteractiveCallback, type PresentResult } from './shared';

/**
 * Present one snapshot of a modal `<Form>` tree as a native `ModalFormData`.
 *
 * The modal is atomic: every field is added up front (via each control's `build`
 * callback during {@link serialize}), the form is shown once, and nothing comes back
 * until the player submits — at which point the positional `formValues` are re-keyed
 * by each control's `name` (recorded by ordinal in the serialize walk) into a single
 * result object handed to `config.onSubmit`. Dismissal calls `config.onCancel`.
 *
 * Submit/cancel run through the same interactive-transaction + re-present/cleanup path
 * as the ActionForm button callbacks, so background logic stays suppressed for the
 * callback and the session tears down (or re-presents) on the same rules.
 *
 * @param player - Player to show the modal to.
 * @param tree - Built tree containing the `modal-form` marker.
 * @param config - Chrome + lifecycle read off the marker.
 * @returns Whether to re-present, clean up, or do nothing.
 */
export async function presentModal(
  player: Player,
  tree: JSX.Element,
  config: FormConfig,
): Promise<PresentResult> {
  const context: ModalSerializationContext = { mode: 'modal', modalControls: new Map(), modalControlIndex: 0 };
  const form = new ModalFormData();

  if (config.title !== undefined) {
    form.title(config.title);
  }

  if (config.body !== undefined) {
    // ModalFormData has no body(); a leading label acts as descriptive text.
    form.label(config.body);
  }

  // Walk the tree: control writers add native controls (recording name-by-ordinal);
  // decorative nodes emit label slots; the modal-form marker is transparent.
  serialize(tree, form, context);

  if (config.submitLabel !== undefined) {
    form.submitButton(config.submitLabel);
  }

  return form.show(player).then((response) => {
    if (response.canceled) {
      if (config.onCancel) {
        return runInteractiveCallback(player, () => config.onCancel?.());
      }

      // No cancel handler: dismissal tears the session down (matches ActionForm ESC).
      return 'cleanup';
    }

    const values = collectValues(context, response.formValues);

    if (config.onSubmit) {
      return runInteractiveCallback(player, () => config.onSubmit?.(values));
    }

    return 'none';
  });
}

/**
 * Re-key the native modal's positional `formValues` into a `{ name: value }` object
 * using the ordinal → name registry built during serialization. Controls with no
 * `name` (or values past the array end) are skipped.
 */
function collectValues(
  context: ModalSerializationContext,
  formValues: readonly (string | number | boolean | undefined)[] | undefined,
): FormValues {
  const values: FormValues = {};

  if (!formValues) {
    return values;
  }

  for (const [ordinal, entry] of context.modalControls) {
    if (entry.name !== '') {
      values[entry.name] = formValues[ordinal];
    }
  }

  return values;
}
