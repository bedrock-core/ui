import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { JSX } from '../jsx';
import {
  ActionSerializationContext, FormTarget, ModalSerializationContext,
  SerializablePrimitive, SerializationContext,
} from './types';

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

/**
 * Narrows a {@link FormTarget} to an `ActionFormData`. The button slot
 * (`form.button()`) only exists on the ActionForm backend, so writers/presenters
 * guard on this before emitting interactive buttons.
 */
export function isActionForm(form: FormTarget): form is ActionFormData {
  return 'button' in form;
}

/**
 * Narrows a {@link FormTarget} to a `ModalFormData`. The typed modal controls
 * (`toggle`/`slider`/`dropdown`/`textField`) live on the modal backend.
 */
export function isModalForm(form: FormTarget): form is ModalFormData {
  return 'toggle' in form;
}

/**
 * Narrows a {@link SerializationContext} to the ActionForm walk (button index +
 * onPress map). Pairs with {@link isActionForm}.
 */
export function isActionContext(ctx: SerializationContext): ctx is ActionSerializationContext {
  return ctx.mode === 'action';
}

/**
 * Narrows a {@link SerializationContext} to the modal walk (control ordinal +
 * onChange map). Pairs with {@link isModalForm}.
 */
export function isModalContext(ctx: SerializationContext): ctx is ModalSerializationContext {
  return ctx.mode === 'modal';
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
