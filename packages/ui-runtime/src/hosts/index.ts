import type { Owner } from '../core/fabric';
import { concreteRoots } from '../core/guards';
import { ContainerScreenError } from '../core/types';
import type { JSX } from '../jsx';
import { CHEST } from './chest/host';
import { FORM_ACTION, FORM_MODAL } from './form/host';
import type { HostContract } from './types';

/**
 * The screens the library can draw on.
 *
 * A list rather than a chain of conditionals: adding a host is adding a
 * contract and an entry, and nothing above this module ever asks which host it
 * is looking at. Order is significant only at the end — the ordinary form
 * claims anything left over, so it goes last.
 */
export const HOSTS: readonly HostContract[] = [CHEST, FORM_MODAL, FORM_ACTION];

export { CHEST } from './chest/host';
export { FORM_ACTION, FORM_MODAL } from './form/host';
export type { Capability, CarrierKind, DrawKind, HostContract, InputKind } from './types';

/**
 * The host a built tree belongs to, decided by what the author wrote at its
 * root. Never undefined: a tree no other host claims is an ordinary form.
 *
 * @param tree - A built tree, as the expand pass leaves it.
 */
export function hostFor(tree: JSX.Element): HostContract {
  const roots = concreteRoots(tree);

  return HOSTS.find(host => host.claims(roots, tree)) ?? FORM_ACTION;
}

/**
 * Checks that the way a screen is being served matches the host its root asks
 * for. The two mistakes are opposite and both worth naming: a compiled screen
 * handed to `render()`, and a form handed to `createContainerScreen`.
 *
 * @throws ContainerScreenError when the owner cannot serve the host.
 */
export function requireOwner(host: HostContract, owner: Owner): void {
  if (host.owners.includes(owner.kind)) {
    return;
  }

  if (host.compiled) {
    throw new ContainerScreenError(
      '`<Container>` is a compiled container screen and cannot be shown with render(). '
      + 'Serve it with createContainerScreen(Screen); a player opens it by interacting '
      + 'with the entity it names.',
    );
  }

  throw new ContainerScreenError(
    'A container screen must render exactly one `<Container>` at its root. The root '
    + 'is what makes the screen a compiled container screen, the way `<Form>` makes '
    + 'one a modal; put everything else inside it.',
  );
}
