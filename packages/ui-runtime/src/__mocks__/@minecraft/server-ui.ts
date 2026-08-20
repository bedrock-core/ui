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

/** Superset response shape covering both form backends (structural typing). */
export interface FormResponse {
  canceled: boolean;
  cancelationReason?: FormCancelationReason;
  selection?: number;
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

// ─── Deferred shows (for lifecycle tests) ───────────────────────────────────────
// With deferred mode on, every show() (Action AND Modal) returns a promise the
// test settles explicitly via __resolveShow / __rejectShow — mirroring a form
// sitting on screen — and uiManager.closeAllForms resolves that player's pending
// shows as canceled(UserClosed), mirroring a programmatic close.

let deferShows = false;

interface PendingShow {
  player: unknown;
  resolve: (response: FormResponse) => void;
  reject: (error: unknown) => void;
}

const pendingShows: PendingShow[] = [];

/** Toggle deferred-show mode (off by default; reset via __resetFormMocks). */
export function __setDeferredShows(defer: boolean): void {
  deferShows = defer;
}

/** Number of shows currently awaiting an explicit resolution. */
export function __pendingShowCount(): number {
  return pendingShows.length;
}

/** Resolve the pending show at `index` (oldest first) with `response`. */
export function __resolveShow(response: FormResponse, index = 0): void {
  const pending = pendingShows.splice(index, 1)[0];

  if (!pending) {
    throw new Error(`__resolveShow: no pending show at index ${index}`);
  }

  pending.resolve(response);
}

/** Reject the pending show at `index` (oldest first) with `error`. */
export function __rejectShow(error: unknown, index = 0): void {
  const pending = pendingShows.splice(index, 1)[0];

  if (!pending) {
    throw new Error(`__rejectShow: no pending show at index ${index}`);
  }

  pending.reject(error);
}

/** Reset ALL form-mock state: deferred mode, pending shows, modal queue. */
export function __resetFormMocks(): void {
  deferShows = false;
  pendingShows.length = 0;
  modalResponseQueue = [];
}

function idOf(value: unknown): string | undefined {
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return undefined;
}

function matchesPlayer(pending: unknown, player: unknown): boolean {
  const playerId = idOf(player);

  return playerId !== undefined ? idOf(pending) === playerId : pending === player;
}

/**
 * Engine-shaped uiManager: closeAllForms resolves ONLY the given player's pending
 * shows as canceled(UserClosed) — other players' forms stay up, as on a server.
 */
export const uiManager = {
  closeAllForms: vi.fn((player: unknown): void => {
    for (let i = pendingShows.length - 1; i >= 0; i--) {
      if (matchesPlayer(pendingShows[i].player, player)) {
        const [pending] = pendingShows.splice(i, 1);

        pending.resolve({ canceled: true, cancelationReason: FormCancelationReason.UserClosed });
      }
    }
  }),
};

export interface ModalFormDataTextFieldOptions { defaultValue?: string; tooltip?: string }
export interface ModalFormDataDropdownOptions { defaultValueIndex?: number; tooltip?: string }
export interface ModalFormDataSliderOptions { defaultValue?: number; valueStep?: number; tooltip?: string }
export interface ModalFormDataToggleOptions { defaultValue?: boolean; tooltip?: string }

export class ActionFormData {
  show = vi.fn((player: unknown): Promise<FormResponse> => {
    if (deferShows) {
      return new Promise<FormResponse>((resolve, reject) => {
        pendingShows.push({ player, resolve, reject });
      });
    }

    return Promise.resolve({ canceled: false, selection: undefined });
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

  show(player: unknown): Promise<ModalFormResponse> {
    if (deferShows) {
      return new Promise<ModalFormResponse>((resolve, reject) => {
        pendingShows.push({ player, resolve, reject });
      });
    }

    const next = modalResponseQueue.length > 0 ? modalResponseQueue.shift()! : DEFAULT_MODAL_RESPONSE;

    return Promise.resolve(next);
  }
}

export class FormRejectError extends Error {
  reason?: FormRejectReason;

  constructor(message: string, reason?: FormRejectReason) {
    super(message);
    this.name = 'FormRejectError';
    this.reason = reason;
  }
}
