// Components
export {
  Button,
  Fragment,
  Image,
  Panel,
  Text,
  type ButtonProps,
  type FragmentProps,
  type ImageProps,
  type PanelProps,
  type TextProps,
  type ControlProps
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

// Hooks
export { useState, useEffect, executeEffects } from './hooks';

export type {
  StateHook,
  EffectHook,
  Hook,
  HookCall,
  ComponentInstance
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
