import { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { Hook } from '../hooks/types';
import { FunctionComponent, JSX } from '../jsx';

// For now we will only be supporting ActionFormData, in future will add support for ModalFormData for "Forms"
export type CoreUIFormData = ActionFormData;

export type ReservedBytes = {

  /* @internal */
  __type: 'reserved';
  bytes: number;
};

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export type SerializableProps = Record<string, SerializablePrimitive>;

export interface SerializationContext {

  /** Maps button index to their onPress callbacks */
  buttonCallbacks: Map<number, () => void>;

  /** Current button index counter */
  buttonIndex: number;
}

/**
 * Options for render() function.
 */
export interface RenderOptions { isFirstRender?: boolean }

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
export interface ComponentInstance {
  id: string;
  player: Player;
  componentType: FunctionComponent;
  props: JSX.Props;
  hooks: Hook[];
  hookIndex: number;
  mounted: boolean;
  shouldClose?: boolean;
}

