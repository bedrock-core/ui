export type ReservedBytes = {

  /* @internal */
  __type: 'reserved';
  bytes: number;
};

export type SerializableString = {

  /* @internal */
  __type: 'serializable_string';
  value: string;
  maxBytes?: number;
};

export type SerializablePrimitive = SerializableString | number | boolean | ReservedBytes;

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
