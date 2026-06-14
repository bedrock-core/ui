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
  PROTOCOL_HEADER_LENGTH,
} from './serializer';

// Rendering
export { render } from './render';

// Component registry (custom native component registration)
export {
  registerComponent,
  getComponentDescriptor,
  getRegisteredTypes,
  isTransparentType,
} from './componentRegistry';

export type { ComponentDescriptor } from './componentRegistry';

// Writer slot helpers (for custom component writers)
export { emitButton, emitLabel } from './writers';

// Types
export type {
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationContext,
  SerializationError,
  TranslationKeysError,
  ItemAuxError,
  Writer,
} from './types';

export { isFunction, isElement, isNode } from './guards';

export {
  getCurrentFiber,
  invariant,
  createContext,
} from './fabric';

export type {
  Context,
  ContextProps,
} from './fabric';
