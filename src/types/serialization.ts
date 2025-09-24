/**
 * Defines types for serializable components and their properties.
 * These types are used to ensure that components can be converted into a format
 * suitable for serialization and transmission.
 *
 * key does not matter, only order and value type matters.
 * This is because serialization is order-dependent and keys are not transmitted.
 */
export interface SerializableComponent {
  type: string;
  [key: string]: SerializablePrimitive;
}

// New reserved primitive type
export type ReservedBytes = {

  /* @internal */
  __type: 'reserved';
  bytes: number;
};

// Update primitive union
export type SerializablePrimitive = string | number | boolean | ReservedBytes;

