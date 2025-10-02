export {
  // Components
  Fragment,
  Image,
  Panel,
  Text,
  // Serialization utilities
  reserveBytes,
  // Rendering
  render,
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
  FragmentProps,
  ImageProps,
  PanelProps,
  TextProps,
  ControlProps,
  // Types
  CoreUIFormData,
  ReservedBytes,
  SerializablePrimitive,
  SerializableProps,
  SerializationError
} from './core';

// JSX Runtime
export { renderJSX } from './jsx';

export type {
  FunctionComponent,
  JSX
} from './jsx';
