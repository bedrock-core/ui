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

/** Whether a press handler is the container exit — what makes a `Button` a close button. */
export const isContainerExit = (value: unknown): boolean => value === containerExit;
