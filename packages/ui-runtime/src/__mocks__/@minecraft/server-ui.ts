/**
 * Mock for @minecraft/server-ui
 * Provides minimal implementation for testing purposes
 */

import { vi } from 'vitest';

export enum FormCancelationReason {
  UserBusy = 'UserBusy',
  UserClosed = 'UserClosed',
}

export enum FormRejectReason {
  MalformedResponse = 'MalformedResponse',
  PlayerQuit = 'PlayerQuit',
  ServerShutdown = 'ServerShutdown',
}

export interface ModalFormResponse {
  canceled: boolean;
  cancelationReason?: FormCancelationReason;
  formValues?: (boolean | number | string | undefined)[];
}

// ─── Controllable ModalFormData.show responses (for tests) ──────────────────────
// showModalForm constructs its own ModalFormData, so tests can't reach the
// instance. Enqueue responses here; each show() dequeues one (falling back to a
// confirmed-empty response).

let modalResponseQueue: ModalFormResponse[] = [];

const DEFAULT_MODAL_RESPONSE: ModalFormResponse = { canceled: false, formValues: [] };

/** Enqueue the responses successive ModalFormData.show() calls should resolve with. */
export function __setModalFormResponses(...responses: ModalFormResponse[]): void {
  modalResponseQueue = [...responses];
}

/** Clear any queued ModalFormData responses. */
export function __resetModalFormMock(): void {
  modalResponseQueue = [];
}

export interface ModalFormDataTextFieldOptions { defaultValue?: string; tooltip?: string }
export interface ModalFormDataDropdownOptions { defaultValueIndex?: number; tooltip?: string }
export interface ModalFormDataSliderOptions { defaultValue?: number; valueStep?: number; tooltip?: string }
export interface ModalFormDataToggleOptions { defaultValue?: boolean; tooltip?: string }

export class ActionFormData {
  show = vi.fn().mockResolvedValue({
    canceled: false,
    selection: undefined,
  });

  title(_text: string): this {
    return this;
  }

  body(_text: string): this {
    return this;
  }

  header(_text: string): this {
    return this;
  }

  label(_text: string): this {
    return this;
  }

  divider(): this {
    return this;
  }

  button(_text: string, _iconPath?: string): this {
    return this;
  }
}

export class ModalFormData {
  title(_text: string): this {
    return this;
  }

  header(_text: string): this {
    return this;
  }

  label(_text: string): this {
    return this;
  }

  divider(): this {
    return this;
  }

  submitButton(_text: string): this {
    return this;
  }

  toggle(_label: string, _options?: ModalFormDataToggleOptions): this {
    return this;
  }

  textField(_label: string, _placeholder: string, _options?: ModalFormDataTextFieldOptions): this {
    return this;
  }

  slider(_label: string, _min: number, _max: number, _options?: ModalFormDataSliderOptions): this {
    return this;
  }

  dropdown(_label: string, _items: string[], _options?: ModalFormDataDropdownOptions): this {
    return this;
  }

  show(_player: unknown): Promise<ModalFormResponse> {
    const next = modalResponseQueue.length > 0 ? modalResponseQueue.shift()! : DEFAULT_MODAL_RESPONSE;

    return Promise.resolve(next);
  }
}

export class FormRejectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormRejectError';
  }
}
