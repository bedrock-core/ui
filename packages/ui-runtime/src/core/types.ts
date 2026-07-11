import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

export interface ReservedBytes { bytes: number }

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export type SerializableProps = Record<string, SerializablePrimitive>;

/**
 * The native form a writer emits into. ActionForm writers use `button()`/`label()`;
 * modal writers use the typed `ModalFormData` controls (`toggle`/`slider`/…). The
 * serializer walk is shared; only the writers and the presenter response-mapping differ.
 */
export type FormTarget = ActionFormData | ModalFormData;

/** A value the native modal can return for a control. */
export type ModalValue = string | number | boolean | undefined;

/**
 * One modal control's identity, recorded by ordinal during the serialize walk so the
 * presenter can map `response.formValues[ordinal]` back to a named entry in the result
 * object. The native modal returns values positionally; this is what re-keys them.
 */
export interface ModalControlEntry {
  /** Result key — the control's `name` prop. */
  name: string;
}

/** Discriminant tags for the two serialization contexts. */
export type FormMode = 'action' | 'modal';

/**
 * Bookkeeping for the ActionForm serialize walk: button index → onPress, mapped
 * back from `response.selection` by the presenter.
 */
export interface ActionSerializationContext {
  readonly mode: 'action';

  /** Maps button index to their onPress callbacks. */
  buttonCallbacks: Map<number, () => void>;

  /** Current button index counter. */
  buttonIndex: number;
}

/**
 * Bookkeeping for the modal serialize walk: control ordinal → {@link ModalControlEntry},
 * used after submit to re-key the positional `response.formValues` into a named result
 * object. Decorative label slots do not consume an ordinal (no `formValues` entry).
 */
export interface ModalSerializationContext {
  readonly mode: 'modal';

  /**
   * Maps a modal control's ordinal (its declaration order among modal controls) to its
   * identity, so `formValues[ordinal]` lands under the right `name` in the result.
   */
  modalControls: Map<number, ModalControlEntry>;

  /** Current modal-control ordinal counter. */
  modalControlIndex: number;
}

/**
 * Context threaded through a single serialize walk. Discriminated by `mode`: the
 * two backends share the walk but never each other's bookkeeping, so a writer
 * narrows on `mode` before touching index/callback state.
 */
export type SerializationContext = ActionSerializationContext | ModalSerializationContext;

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * @deprecated No longer thrown: a `localizationKey` missing from the map measures as the
 * literal key string (mirroring Bedrock's unmatched-key rendering). Kept for API compat.
 */
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

export class ScrollLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrollLimitError';
  }
}

/**
 * Thrown when a tree violates the modal-form restrictions: a regular interactive
 * control (e.g. `Button`) inside a `<ModalForm>`, a nested `<ModalForm>`, a modal
 * form mixed with ActionForm-only roots, or a modal-only control used outside any
 * `<ModalForm>`. A modal renders the native `ModalFormData`, which only supports
 * toggle/slider/dropdown/textField/label plus the hardcoded submit + esc buttons.
 */
export class ModalFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModalFormError';
  }
}

export type Writer = (
  payload: string,
  form: FormTarget,
  ctx: SerializationContext | undefined,
  callbacks: Record<string, (...args: unknown[]) => void>,
  props?: SerializableProps,
  nativeArgs?: Record<string, unknown>,
  // The element's built children (post-layout). Only writers that read child geometry rather
  // than have the walk serialize them use it — e.g. `Form.Radio`/`Form.ToggleButton` reading each
  // laid-out `Form.Option`'s x/y/w/h. Typed `unknown` to avoid a JSX import here; the writer
  // narrows it. Most writers ignore it (children are serialized by the walk in `serialize`).
  children?: unknown,
) => void;
