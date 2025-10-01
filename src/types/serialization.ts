/**
 * Defines types for serializable components and their properties.
 * These types are used to ensure that components can be converted into a format
 * suitable for serialization and transmission.
 *
 * key does not matter, only order and value type matters.
 * This is because serialization is order-dependent and keys are not transmitted.
 */
export interface SerializableComponent {
  type: SerializableString;
  children: SerializableComponent[];
  [key: string]: SerializablePrimitive;
}

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

export type SerializablePrimitive = SerializableComponent | SerializableComponent[] | SerializableString | number | boolean | ReservedBytes;

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
