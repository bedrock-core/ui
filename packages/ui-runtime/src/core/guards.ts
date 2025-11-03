import { SerializablePrimitive } from './types';

export const isFunction = <T>(value: unknown): value is (...args: unknown[]) => T => typeof value === 'function';

export function isSerializablePrimitive(value: unknown): value is SerializablePrimitive {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  // Check for ReservedBytes object
  if (typeof value === 'object' && value !== null && value !== undefined && 'bytes' in value) {
    return true;
  }

  return false;
}
