// Serialization
export {
  reserveBytes,
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
export { render } from './runtime';

// Context
export { createContext } from './context';
export type { Context, ProviderProps } from './context';

// Types
export type {
  CoreUIFormData,
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationContext,
  SerializationError,
  RenderOptions
} from './types';
