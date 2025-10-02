import { Player } from '@minecraft/server';
import { ActionFormData, ActionFormResponse, FormRejectError } from '@minecraft/server-ui';
import { JSX } from '../jsx';
import { PROTOCOL_HEADER, serialize } from './serializer';
import { SerializationContext } from './types';

/**
 * Present a JSX component to a player using the @bedrock-core/ui system.
 *
 * @param player - The player to show the UI to
 * @param component - JSX component function or element
 */
export async function render(player: Player, component: JSX.Element): Promise<void> {
  const form = new ActionFormData();

  // Create serialization context to collect button callbacks
  const context: SerializationContext = {
    buttonCallbacks: new Map(),
    buttonIndex: 0,
  };

  form.title(PROTOCOL_HEADER);

  // Pass context to serialize
  serialize(component, form, context);

  form.show(player).then((response: ActionFormResponse): void => {
    if (response.canceled) {
      // User canceled the form
      return;
    }

    // Check if a button was selected and execute its callback
    if (response.selection !== undefined) {
      const callback = context.buttonCallbacks.get(response.selection);

      if (callback) {
        callback();
      }
    }
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}
