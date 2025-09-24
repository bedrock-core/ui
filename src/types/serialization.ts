/**
 * Serialization related types and enums
 */

export interface SerializedComponent {
  type: string;
  [key: string]: SerializablePrimitive;
}

export type SerializablePrimitive = string | number | boolean;

// Future ideal support types:
// | undefined | null | SerializedComponent[] | { [key: string]: SerializedComponent };
