/**
 * Mock for @minecraft/server-ui
 * Provides minimal implementation for testing purposes
 */

import { vi } from 'vitest';
import type { RawMessage } from '@minecraft/server';

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
// A modal is created inside the present, so a test cannot reach the instance.
// Enqueue responses here; each show() dequeues one, falling back to a
// confirmed-empty response.

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
  lastModal = undefined;
  lastAction = undefined;
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

/** The most recent ActionFormData a test's subject constructed, for asserting what it wrote. */
let lastAction: ActionFormData | undefined;

export function __lastActionForm(): ActionFormData | undefined {
  return lastAction;
}

/** The most recent ModalFormData, for asserting the rows a compiled screen wrote. */
let lastModal: ModalFormData | undefined;

export function __lastModalForm(): ModalFormData | undefined {
  return lastModal;
}

/** Records the newest instance. A function call rather than `const self = this`. */
function rememberModal(form: ModalFormData): void {
  lastModal = form;
}

/** Records the newest instance. A function call rather than `const self = this`. */
function remember(form: ActionFormData): void {
  lastAction = form;
}

export class ActionFormData {
  /** What `title()` was called with, so a test can read the screen key off it. */
  titleText: string | RawMessage = '';
  /** What every `button()` was called with, in order — the entries a compiled screen wrote, values and all. */
  buttons: (string | RawMessage)[] = [];

  /** The icon path of every `button()`, in order. A compiled screen sets none. */
  icons: (string | undefined)[] = [];

  constructor() {
    remember(this);
  }

  show = vi.fn((player: unknown): Promise<FormResponse> => {
    if (deferShows) {
      return new Promise<FormResponse>((resolve, reject) => {
        pendingShows.push({ player, resolve, reject });
      });
    }

    return Promise.resolve({ canceled: false, selection: undefined });
  });

  title(text: string | RawMessage): this {
    this.titleText = text;

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

  button(text: string | RawMessage, iconPath?: string): this {
    this.buttons.push(text);
    this.icons.push(iconPath);

    return this;
  }
}

/** One call a modal recorded: which method, and the label it was given. */
export interface ModalRow { kind: string; label: string; items?: string[] }

export class ModalFormData {
  /** What `title()` was called with, so a test can read the screen key off it. */
  titleText: string | RawMessage = '';
  /**
   * Every row-producing call, in order. `formValues` is positional and a label
   * occupies a slot in it, so the ORDER and the COUNT here are what a compiled
   * screen's baked indices are checked against.
   */
  rows: ModalRow[] = [];

  constructor() {
    rememberModal(this);
  }

  title(text: string): this {
    this.titleText = text;

    return this;
  }

  header(text: string): this {
    this.rows.push({ kind: 'header', label: text });

    return this;
  }

  label(text: string): this {
    this.rows.push({ kind: 'label', label: text });

    return this;
  }

  divider(): this {
    this.rows.push({ kind: 'divider', label: '' });

    return this;
  }

  submitButton(_text: string): this {
    return this;
  }

  toggle(label: string, _options?: ModalFormDataToggleOptions): this {
    this.rows.push({ kind: 'toggle', label });

    return this;
  }

  textField(label: string, _placeholder: string, _options?: ModalFormDataTextFieldOptions): this {
    this.rows.push({ kind: 'textField', label });

    return this;
  }

  slider(label: string, _min: number, _max: number, _options?: ModalFormDataSliderOptions): this {
    this.rows.push({ kind: 'slider', label });

    return this;
  }

  dropdown(label: string, items: string[], _options?: ModalFormDataDropdownOptions): this {
    this.rows.push({ kind: 'dropdown', label, items: [...items] });

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
