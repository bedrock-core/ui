import { JSX } from '../jsx';
import { SerializablePrimitive } from './types';

export const isFunction = <T>(value: unknown): value is (...args: unknown[]) => T => typeof value === 'function';

export function isElement(value: unknown): value is JSX.Element {
  return !!value && typeof value === 'object' && !Array.isArray(value) && 'type' in (value);
}

export function isNode(value: unknown): value is JSX.Node {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(item => item === null || item === undefined || isElement(item));
  }

  return isElement(value);
}

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
