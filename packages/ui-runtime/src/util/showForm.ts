import { type Player, system } from '@minecraft/server';
import {
  FormCancelationReason, ModalFormData, type ModalFormResponse,
} from '@minecraft/server-ui';

/**
 * Adds the control(s) to a freshly-created `ModalFormData`. Typically adds a
 * single control (text field, dropdown, slider, …) for an input-like component.
 */
export type ModalFormBuilder = (form: ModalFormData) => void;

/**
 * Optional chrome for the modal opened by {@link showModalForm}.
 *
 * Note: `ModalFormData` has no `body()` in `@minecraft/server-ui` v2 — `body`
 * is rendered as a leading `label` line above the control(s).
 */
export interface ShowModalFormOptions {
  /** Modal title. */
  title?: string;
  /** Descriptive text shown above the control(s) (rendered as a label). */
  body?: string;
  /** Text for the confirm/submit button. */
  submitLabel?: string;
}

/**
 * How many times to retry showing the modal while the player is `UserBusy`.
 * The modal is opened in the same tick the ActionForm button closed, so this
 * is purely defensive; a small cap avoids an unbounded loop if the player keeps
 * another screen (e.g. chat) open.
 */
const BUSY_RETRY_LIMIT = 20;

/**
 * Build & show a single-control `ModalFormData` from inside an ActionForm button
 * callback, returning the player's response. The runtime owns this "open the
 * sub-form, return to the system" transition: it is invoked while the presenter's
 * interactive transaction is active, so background logic passes stay suppressed
 * for the whole modal lifetime, and the root ActionForm re-presents afterward.
 *
 * @param player - Player to show the modal to.
 * @param build - Adds the control(s) to the form.
 * @param opts - Optional title / body / submit-button text.
 * @returns The modal response (`canceled` + `formValues`).
 */
export async function showModalForm(
  player: Player,
  build: ModalFormBuilder,
  opts: ShowModalFormOptions = {},
): Promise<ModalFormResponse> {
  const buildForm = (): ModalFormData => {
    const form = new ModalFormData();

    if (opts.title !== undefined) {
      form.title(opts.title);
    }

    if (opts.body !== undefined) {
      // ModalFormData has no body(); a leading label acts as descriptive text.
      form.label(opts.body);
    }

    build(form);

    if (opts.submitLabel !== undefined) {
      form.submitButton(opts.submitLabel);
    }

    return form;
  };

  let response = await buildForm().show(player);

  for (
    let attempts = 0;
    response.canceled
    && response.cancelationReason === FormCancelationReason.UserBusy
    && attempts < BUSY_RETRY_LIMIT;
    attempts++
  ) {
    await system.waitTicks(1);
    response = await buildForm().show(player);
  }

  return response;
}
