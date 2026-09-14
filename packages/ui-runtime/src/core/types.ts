import type { RawMessage } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import type { PressEvent } from './events';

export interface ReservedBytes { bytes: number }

/**
 * v0008: the LAST field of a payload may be a variable-length tail — unpadded,
 * unprefixed, unmarked, uncapped. A string tail is appended verbatim; a
 * RawMessage tail makes the whole form text a rawtext pair
 * `[{ text: <fixed fields> }, <tail>]`, so the CLIENT resolves the tail (its
 * own language, `with` parameters filled) into exactly the tail region.
 */
export type TailValue = { tail: string | RawMessage };

export type SerializablePrimitive = string | number | boolean | ReservedBytes | TailValue;

export type SerializableProps = Record<string, SerializablePrimitive>;

/**
 * The native form a writer emits into. An action form takes `button()`/`label()`;
 * a modal takes the typed `ModalFormData` controls (`toggle`/`slider`/…). Both are
 * filled by the host's runtime from the addresses the build allocated.
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
  /**
   * Turns what the engine answers back into what the author asked for, where
   * the two are not the same unit.
   *
   * A slider is the case: the engine holds a STOP INDEX and the author wrote a
   * range, so the form is given the index range and the answer is mapped back
   * here. Absent means the answer is already the author's value.
   */
  decode?: (raw: string | number | boolean | undefined) => string | number | boolean | undefined;
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
  buttonCallbacks: Map<number, (event: PressEvent) => unknown>;

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
 * @deprecated No longer thrown: a key missing from the resolver measures as the
 * literal key string (mirroring Bedrock's unmatched-key rendering). Kept for API compat.
 */
export class TranslationKeysError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationKeysError';
  }
}

/**
 * Thrown when `render()` is handed a screen the build never compiled.
 *
 * A screen is shown from its layout in the pack, picked by the title the build
 * registered it under. Without that there is nothing to show, so this names the
 * two things that produce one: the ui-compiler filter seeing the screen, and the
 * generated module being imported so its registrations run.
 */
export class UncompiledScreenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UncompiledScreenError';
  }
}

/**
 * Thrown when a tree violates the modal-form restrictions: a regular interactive
 * control (e.g. `Button`) inside a `<Form>`, or a modal-only control used outside
 * any `<Form>`. A modal renders the native `ModalFormData`, which only supports
 * toggle/slider/dropdown/textField/label plus the hardcoded submit + esc buttons.
 */
export class ModalFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModalFormError';
  }
}

/**
 * Thrown when a tree has no host root, or a root below its root. A screen's
 * root names its host — `<Screen>`, `<Form>` or `<Container>` — and there is
 * no default, so a tree that starts with anything else has no screen to be.
 */
export class ScreenRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScreenRootError';
  }
}

/**
 * Thrown when a tree breaks the container-screen rules: a `<Container>` handed
 * to `render()`, a container-only control outside a `<Container>`, a form or a
 * scroll inside one, a hook that needs a player where one compiled layout
 * serves every player, or content that does not fit the canvas.
 */
export class ContainerScreenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerScreenError';
  }
}

export type Writer = (
  payload: string | RawMessage,
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
