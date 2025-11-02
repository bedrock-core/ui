import { ActionFormData } from '@minecraft/server-ui';

// For now we will only be supporting ActionFormData, in future will add support for ModalFormData for "Forms"
export type CoreUIFormData = ActionFormData;

export interface ReservedBytes { bytes: number }

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export type SerializableProps = Record<string, SerializablePrimitive>;

export interface SerializationContext {

  /** Maps button index to their onPress callbacks */
  buttonCallbacks: Map<number, () => void>;

  /** Current button index counter */
  buttonIndex: number;
}

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}

export type Writer = (
  payload: string,
  form: CoreUIFormData,
  ctx: SerializationContext | undefined,
  callbacks: Record<string, (...args: unknown[]) => void>,
) => void;
