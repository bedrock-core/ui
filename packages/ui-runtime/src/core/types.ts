import { ActionFormData } from '@minecraft/server-ui';

// Screen layout kinds. Each maps to a distinct RP layout/region composition:
//  - 'scroll'      — single vertical scroll region (default).
//  - 'dual_scroll' — two side-by-side vertical scroll regions (regions 0 and 1).
// Extend this union as new screen types with distinct RP layouts/capabilities are added.
export type ScreenType = 'scroll' | 'dual_scroll';

export interface ReservedBytes { bytes: number }

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export type SerializableProps = Record<string, SerializablePrimitive>;

export interface SerializationContext {

  /** Maps button index to their onPress callbacks */
  buttonCallbacks: Map<number, () => void>;

  /** Current button index counter */
  buttonIndex: number;
}

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}

export class TranslationKeysError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationKeysError';
  }
}

export class ItemAuxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ItemAuxError';
  }
}

export type Writer = (
  payload: string,
  form: ActionFormData,
  ctx: SerializationContext | undefined,
  callbacks: Record<string, (...args: unknown[]) => void>,
  props?: SerializableProps,
) => void;
