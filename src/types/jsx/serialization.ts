
/**
 * Serialization related types and enums
 */

/**
 * Component type enumeration for compactness in serialization
 */
export enum ComponentType {
  PANEL = 0,
  BUTTON = 1,
  TEXT = 2,
  TOGGLE = 3,
  SLIDER = 4,
  INPUT = 5,
  IMAGE = 6,
  // Reserved for future components 7-255
}

/**
 * Property encoding strategies
 */
export type PropertyArray = (string | number | boolean | null)[];

/**
 * Compact component representation for serialization
 */
export interface CompactComponent {
  t: ComponentType;        // Component type (enum 0-255)
  i?: string;             // ID (optional)
  p: PropertyArray;       // Properties as array
  c?: CompactComponent[]; // Children (optional)
}

/**
 * Ultra-compact serialization format
 */
export interface UISerializedData {
  v: string;               // Version (e.g., "1.0")
  t: 'ui';                // Type identifier
  c: string;              // Checksum (CRC32)
  z: boolean;             // Compressed flag
  d: CompactComponent[];  // Component data
}

/**
 * Error types for the UI system
 */
export class UIError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'UIError';
  }
}

export class SerializationError extends UIError {
  constructor(message: string) {
    super(message, 'SERIALIZATION_ERROR');
  }
}

export class DeserializationError extends UIError {
  constructor(message: string) {
    super(message, 'DESERIALIZATION_ERROR');
  }
}

export class RenderError extends UIError {
  constructor(message: string, public componentId?: string) {
    super(message, 'RENDER_ERROR');
  }
}

export class ValidationError extends UIError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}