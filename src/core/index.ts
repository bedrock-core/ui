// Components
export {
  Button,
  Fragment,
  Image,
  Panel,
  Text,
  Suspense,
  type ButtonProps,
  type FragmentProps,
  type ImageProps,
  type PanelProps,
  type TextProps,
  type ControlProps,
  type SuspenseProps
} from './components';

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
export { render } from './render';

// Context
export { createContext } from './context';
export type { Context, ProviderProps } from './context';

// Hooks
export {
  useState,
  useEffect,
  executeEffects,
  useRef,
  useContext,
  useReducer,
  usePlayer,
  useEvent,
  useExit,
  useRefresh,
  useSuspendedState
} from './hooks';

export type {
  StateHook,
  EffectHook,
  RefHook,
  ContextHook,
  ReducerHook,
  Hook,
  HookCall,
  ComponentInstance,
  EventSignal,
  RefreshFunctions,
  SuspendedStateMarker
} from './hooks';

// Types
export type {
  CoreUIFormData,
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationContext,
  SerializationError
} from './types';
