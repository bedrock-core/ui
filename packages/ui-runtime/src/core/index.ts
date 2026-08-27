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

// What the build's generated module calls to say a screen was compiled.
export { compiledTitleOf, registerCompiledScreen } from './render/screens';

// What every handler is called with.
export type { ContainerEvent, PressEvent, SlotEvent, UiEvent } from './events';

// Component registry (custom native component registration)
export {
  registerComponent,
  getComponentDescriptor,
  getRegisteredTypes,
  isTransparentType,
} from './componentRegistry';

export type { ComponentDescriptor } from './componentRegistry';

// Writer slot helpers (for custom component writers)
export { emitButton, emitDropdown, emitHeader, emitInput, emitLabel, emitSlider, emitToggle } from './writers';

// Types
export type {
  ActionSerializationContext,
  FormMode,
  FormTarget,
  ModalControlEntry,
  ModalSerializationContext,
  ModalValue,
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationContext,
  Writer,
} from './types';

// Error classes are VALUES, not types: they are exported so callers can catch
// them with `instanceof`.
export {
  ContainerScreenError,
  ModalFormError,
  ScrollLimitError,
  SerializationError,
  TranslationKeysError,
} from './types';

export {
  isFunction, isElement, isNode, childElements,
  isActionForm, isModalForm, isActionContext, isModalContext,
} from './guards';

export {
  getCurrentFiber,
  invariant,
  createContext,
  BUILD_OWNER,
  entityOwner,
  playerOwner,
} from './fabric';

export type {
  Context,
  ContextProps,
  Owner,
} from './fabric';
