import { ModalFormData } from '@minecraft/server-ui';

// For now we will only be supporting ModalFormData, in future depending on requirements
// we might add support for other form types
export type CoreUIFormData = ModalFormData;


export type ReservedBytes = {

  /* @internal */
  __type: 'reserved';
  bytes: number;
};

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
