import { ModalFormData } from '@minecraft/server-ui';
import { Player } from '@minecraft/server';

/**
 * Global Context - stores all the state needed during rendering
 */
export interface Context {
  form?: ModalFormData;
  player?: Player;
}

let currentContext: Context = {
  form: undefined,
  player: undefined,
};

/**
 * Set the entire context (used internally by present function)
 * @internal
 */
export function setContext(context: Partial<Context>): void {
  currentContext = { ...currentContext, ...context };
}

/**
 * React-style hook to access the entire context
 *
 * @example
 * ```ts
 * const { form, player } = useContext();
 * ```
 */
export function useContext(): Required<Context> {
  if (!currentContext.form || !currentContext.player) {
    throw new Error('useContext() called outside of present() context. Make sure components are rendered within present().');
  }

  return currentContext as Required<Context>;
}
