// The byte payload a chooser's options still ride; see ./payload.
export {
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
} from './payload';

// Rendering
export { render } from './render';
export type { RenderOptions } from './render';

// What the build's generated module calls to say a screen was compiled.
export {
  compiledKeyOf, compiledScreens, compiledSnapshotOf, compiledTitleOf, containerLooksOf, registerCompiledScreen,
  registerContainerLooks,
  registerStaticScreens, screenForKey, staticScreen, staticScreens,
} from './render/screens';
export type { CompiledScreen, CompiledSnapshot, StaticScreenRecord } from './render/screens';

export {
  registerScreenMetadata, screenMetadata, screenMetadataFor, screenMetadataOf, isScreenMetadata, screenParametersError,
} from './render/metadata';
export type { ScreenMetadata, ScreenParameter, ScreenParameters } from './render/metadata';
export { observeRenderLifecycle, renderSession } from './render/notifications';
export type { RenderSession, RenderEndReason, RenderLifecycleEvent, RenderLifecycleListener } from './render/notifications';
export { endRender } from './render/control';
export type { EndRenderOptions } from './render/control';
export { withActionMetadata } from './render/actions';
export type { ActionMetadataFactory, ActionMetadataContext } from './render/actions';

export { whyNotPlainData } from './plainData';

// How a screen reads its own state.
export type { Immutable, ReducerSlot, StateSlot, StateUpdate } from './immutable';

// What every handler is called with.
export type { ContainerEvent, PressEvent, ScreenHost, SlotEvent, UiEvent } from './events';

// Component registry (custom native component registration)
export {
  registerComponent,
  getComponentDescriptor,
  getRegisteredTypes,
  isTransparentType,
} from './componentRegistry';

export type { ComponentDescriptor } from './componentRegistry';

// The typed calls a modal's fields are made with.
export { emitDropdown, emitInput, emitLabel, emitSlider, emitToggle } from './writers';

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
  ScreenRootError,
  SerializationError,
  UncompiledScreenError,
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
