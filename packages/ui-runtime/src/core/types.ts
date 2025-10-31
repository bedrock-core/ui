import { ActionFormData } from '@minecraft/server-ui';
import { FunctionComponent, JSX } from '../jsx';

// For now we will only be supporting ActionFormData, in future will add support for ModalFormData for "Forms"
export type CoreUIFormData = ActionFormData;

export type ReservedBytes = {

  /* @internal */
  __type: 'reserved';
  bytes: number;
};

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export type SerializableProps = Record<string, SerializablePrimitive>;

export interface SerializationContext {

  /** Maps button index to their onPress callbacks */
  buttonCallbacks: Map<number, () => void>;

  /** Current button index counter */
  buttonIndex: number;
}

/**
 * Options for render() function to control suspension behavior.
 */
export interface RenderOptions {

  /**
   * When true, waits for all useState values to differ from their initial values
   * before showing the main UI. Shows fallback UI during waiting period.
   *
   * @default false
   */
  awaitStateResolution?: boolean;

  /**
   * Maximum time in milliseconds to wait for state resolution.
   * After timeout, shows main UI regardless of state resolution status.
   * Only applies when awaitStateResolution is true.
   *
   * @default 10000 (10 seconds)
   */
  awaitTimeout?: number;

  /**
   * Fallback UI to show while waiting for state resolution.
   * Only applies when awaitStateResolution is true.
   * If not provided, shows a default "Loading..." panel.
   *
   * @default <Panel><Text text="Loading..." /></Panel>
   */
  fallback?: JSX.Element | FunctionComponent;
}

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}
