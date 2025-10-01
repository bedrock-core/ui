// Exports
export {
  Fragment,
  Image,
  Panel,
  Text
} from './core/components';

export { reserveBytes, serializeString } from './core/serializer';
export { useContext } from './jsx';
export type { Context } from './jsx';

export type {
  FragmentProps,
  ImageProps,
  PanelProps,
  TextProps
} from './core/components';

export type * from './types';

// Code

import { Player } from '@minecraft/server';
import { FormRejectError, ModalFormData } from '@minecraft/server-ui';
import { PROTOCOL_HEADER } from './core/serializer';
import { setContext } from './jsx/context';
import { JSXNode } from './jsx/jsx-runtime';

/**
 * Present a component to a player using the @bedrock-core/ui system.
 *
 * Flow:
 * 1) Creates a ModalFormData instance.
 * 2) Invokes component.serialize(form). The component is responsible for:
 *    - registering interactive controls via form.* APIs, and
 *    - setting the component label with the encoded payload
 * 3) Shows the form to the player.
 * 4) The JSON UI resource pack decodes the payload and renders the UI.
 *
 * @param player - The player to show the UI to
 * @param component - Component to present
 * @throws Error if form.show fails
 */

/**
 * Present a JSX component to a player using the @bedrock-core/ui system.
 *
 * @param player - The player to show the UI to
 * @param component - JSX component function or element
 */
export async function render(player: Player, component: JSXNode): Promise<void> {
  const form = new ModalFormData();
  setContext({ form, player });

  form.title(PROTOCOL_HEADER);

  // TODO Serialize the component and append values to form
  // the serialization should be enough
  // const result = serialize(component);

  form.show(player).then((): void => {
    // Form shown successfully
    // TODO logic for buttons
    // TODO form logics
    // TODO NAVIGATION

    setContext({ form: undefined, player: undefined });
  }).catch((error: FormRejectError): never => {
    setContext({ form: undefined, player: undefined });

    throw error;
  });
}
