import { Player } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import type { Component } from './types/component';
import { Logger } from './util/Logger';

/**
 * Present a component to a player using the @bedrock-core/ui system.
 *
 * Flow:
 * 1) Creates a ModalFormData instance.
 * 2) Invokes component.serialize(form). The component is responsible for:
 *    - registering interactive controls via form.* APIs, and
 *    - setting the component title/label with the encoded payload (prefix `bcui` + VERSION).
 * 3) Shows the form to the player.
 * 4) The JSON UI resource pack decodes the payload and renders the UI.
 *
 * Note: Present does not manipulate the encoded payload directly; components should call
 * form.<component>(serializedPayload) inside their serialize(form) implementation.
 *
 * @param player - The player to show the UI to
 * @param component - Component or component tree to display
 * @returns Promise that resolves when the form is presented
 */
export async function present(player: Player, component: Component): Promise<void> {
  const form = new ModalFormData();

  component.serialize(form);

  form.show(player).then(() => {
    // TODO STUFF
    // Form shown successfully
  }).catch(error => {
    Logger.error(`Error showing form: ${error}`);
  });
}
