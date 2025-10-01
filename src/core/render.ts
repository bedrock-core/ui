import { Player } from '@minecraft/server';
import { FormRejectError, ModalFormData } from '@minecraft/server-ui';
import { JSX } from '../jsx';
import { PROTOCOL_HEADER, serialize } from './serializer';


/**
 * Present a JSX component to a player using the @bedrock-core/ui system.
 *
 * @param player - The player to show the UI to
 * @param component - JSX component function or element
 */
export async function render(player: Player, component: JSX.Element): Promise<void> {
  const form = new ModalFormData();

  form.title(PROTOCOL_HEADER);

  serialize(component, form);

  form.show(player).then((): void => {
    // Form shown successfully
    // TODO logic for buttons
    // TODO form logics
    // TODO NAVIGATION
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}