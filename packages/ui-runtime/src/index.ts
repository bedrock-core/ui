export {
  // Components
  Button,
  Fragment,
  Image,
  Panel,
  Text,
  // Serialization utilities
  reserveBytes,
  // Rendering
  render,
  // Context
  createContext,
  // Hooks
  useState,
  useEffect,
  useRef,
  useContext,
  useReducer,
  usePlayer,
  useEvent,
  useExit,
  useTriggerRender,
  useRenderCondition,
  // Protocol constants
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
} from './core';

export type {
  // Component types
  ButtonProps,
  FragmentProps,
  ImageProps,
  PanelProps,
  TextProps,
  ControlProps,
  // Context types
  Context,
  ProviderProps,
  // Hook types
  StateHook,
  EffectHook,
  RefHook,
  ContextHook,
  ReducerHook,
  ComponentInstance,
  EventSignal,
  // Types
  CoreUIFormData,
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationContext,
  SerializationError,
  RenderOptions,
  // Runtime/renderer contracts
  VirtualNode,
  InstanceId,
  RuntimeHandle,
  RuntimeOptions,
  Scheduler,
  Renderer,
  RenderCondition,
  TriggerRender,
  UseRenderCondition,
  UseTriggerRender
} from './core';

// JSX Runtime
export { renderJSX } from './jsx';

export type {
  FunctionComponent,
  JSX
} from './jsx';
