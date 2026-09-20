/**
 * The press `useExit()` hands a container screen.
 *
 * Nothing in the API closes a container from script, so calling it does
 * nothing. The build recognises it on a `Button`'s `onPress` and makes that
 * button the screen's close button, which the client handles. A leaf module,
 * because both a component and the dispatcher need it without dragging the
 * render pipeline in.
 */
export const containerExit = (): void => {
  // The client closes the screen; there is nothing for script to do.
};

/**
 * The per-player handles `useExit()` hands a form. Each is a closure over its
 * fiber, so they cannot be one sentinel — but a `Button` pressing one is the
 * screen's close button all the same, and the claims walk has to say so on
 * the runtime's tree exactly as it did on the build's: a compiled layout has
 * no entry for the close button (the client closes the screen), so an entry
 * the runtime allocated for it would shift every press after it by one.
 */
const exitHandles = new WeakSet<object>();

/** Records `handle` as an exit handle; returns it. */
export const markExit = (handle: () => void): (() => void) => {
  exitHandles.add(handle);

  return handle;
};

/** Whether a press handler is an exit — what makes a `Button` a close button. */
export const isContainerExit = (value: unknown): boolean =>
  value === containerExit || (typeof value === 'function' && exitHandles.has(value));
