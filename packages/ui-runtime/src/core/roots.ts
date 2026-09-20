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

/** The screens the library draws on, named. One per root. */
export type HostId = 'form-action' | 'form-modal' | 'chest';

/** The host each root names, which is the whole of what a root decides. */
export const HOST_OF_ROOT: Readonly<Record<string, HostId>> = {
  [SCREEN_TYPE]: 'form-action',
  [MODAL_FORM_SLOT_TYPE]: 'form-modal',
  [CONTAINER_TYPE]: 'chest',
};

/** Whether an element type names a host. */
export const isHostRoot = (type: string): boolean => type in HOST_OF_ROOT;

const HOST_IDS: readonly string[] = Object.values(HOST_OF_ROOT);

/** Whether a string is one of the hosts, for values that arrive untyped. */
export const isHostId = (value: unknown): value is HostId =>
  typeof value === 'string' && HOST_IDS.includes(value);
