/**
 * The element types that name a host at the root of a screen.
 *
 * A leaf module on purpose: the host registry reads these when it is built
 * and the components emit them, and both sit deep in import graphs that
 * meet. Kept here, the strings are initialised before either side runs.
 */

/** Emitted by `<Screen>`: an action form. */
export const SCREEN_TYPE = 'screen';

/** Emitted by `<Form>`: a native modal form. */
export const MODAL_FORM_SLOT_TYPE = 'modal-form';

/** Emitted by `<Container>`: a compiled container screen. */
export const CONTAINER_TYPE = 'container';

const ROOT_TYPES: readonly string[] = [SCREEN_TYPE, MODAL_FORM_SLOT_TYPE, CONTAINER_TYPE];

/** Whether an element type names a host. */
export const isHostRoot = (type: string): boolean => ROOT_TYPES.includes(type);
