export {
  Button,
  Dropdown,
  Image,
  Input,
  Panel,
  Slider,
  Text,
  Toggle,
  Fragment
} from './core/components';

export type {
  FragmentProps,
  ButtonProps,
  DropdownProps,
  ImageProps,
  InputProps,
  PanelProps,
  SliderProps,
  TextProps,
  ToggleProps
} from './core/components';

export { reserveBytes, serializeString } from './core/serializer';
export type * from './types';

import type { Component } from './types/component';
import { Player } from '@minecraft/server';
import { FormRejectError, ModalFormData } from '@minecraft/server-ui';
import { PROTOCOL_HEADER } from './core/serializer';

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
export async function present(player: Player, component: Component): Promise<void> {
  const form = new ModalFormData();

  form.title(PROTOCOL_HEADER);

  component.serialize(form);

  form.show(player).then((): void => {
    // Form shown successfully
    // TODO logic for buttons
    // TODO form logics
    // TODO NAVIGATION
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}
