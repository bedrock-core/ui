/**
 * Mock for @minecraft/server-ui
 * Provides minimal implementation for testing purposes
 */

import { vi } from 'vitest';

export class ModalFormData {
  title(_text: string): this {
    return this;
  }

  body(_text: string): this {
    return this;
  }

  label(_text: string): this {
    return this;
  }

  toggle(_label: string, _defaultValue?: boolean): this {
    return this;
  }

  textField(_label: string, _placeholder?: string, _defaultValue?: string): this {
    return this;
  }

  slider(_label: string, _min: number, _max: number, _step: number, _defaultValue?: number): this {
    return this;
  }

  dropdown(_label: string, _options: string[], _defaultValue?: number): this {
    return this;
  }

  show = vi.fn().mockResolvedValue({
    canceled: false,
    formValues: [],
  });
}

export class FormRejectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormRejectError';
  }
}
