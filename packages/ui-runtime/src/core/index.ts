// Serialization
export {
  serialize,
  PROTOCOL_HEADER,
  VERSION,
  PAD_CHAR,
  TYPE_WIDTH,
  PREFIX_WIDTH,
  MARKER_WIDTH,
  FULL_WIDTH,
  TYPE_PREFIX,
  FIELD_MARKERS,
  PROTOCOL_HEADER_LENGTH
} from './serializer';

// Rendering
export { render } from './render';

// Types
export type {
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationContext,
  SerializationError
} from './types';

export { isFunction } from './guards';

export {
  getCurrentFiber,
  invariant,
  createContext
} from './fabric';

export type {
  Context,
  ContextProps
} from './fabric';
