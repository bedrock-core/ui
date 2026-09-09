import { isTransparentType } from '../core/componentRegistry';
import type { Owner } from '../core/fabric';
import { childElements, isElement } from '../core/guards';
import { isHostRoot } from '../core/roots';
import { ContainerScreenError, ScreenRootError } from '../core/types';
import type { JSX } from '../jsx';
import { CHEST } from './chest/host';
import { FORM_ACTION, FORM_MODAL } from './form/host';
import type { HostContract } from './types';

/**
 * The screens the library can draw on.
 *
 * A list rather than a chain of conditionals: adding a host is adding a
 * contract and an entry, and nothing above this module ever asks which host it
 * is looking at. Each host is named by one root element, so the order carries
 * no meaning.
 */
export const HOSTS: readonly HostContract[] = [CHEST, FORM_MODAL, FORM_ACTION];

export { CHEST } from './chest/host';
export { FORM_ACTION, FORM_MODAL } from './form/host';
export type {
  Capability, CarrierKind, ComponentKind, DrawKind, HostContract, InputKind, Mechanism,
} from './types';

/** The roots, the way an author writes them, for the message a rootless tree gets. */
const ROOTS = '`<Screen>` for an action form, `<Form>` for a modal, `<Container entity="…">` for a container screen';

/**
 * The element at the root of a built tree: the first one that is not a
 * transparent wrapper. Providers and fragments above it are looked through,
 * the way every pass looks through them; a host root is transparent to the
 * layout too, but it is what this walk is looking for, so it stops there.
 *
 * `undefined` when a wrapper holds no single element to descend into.
 */
export function rootOf(tree: JSX.Node): JSX.Element | undefined {
  if (!isElement(tree)) {
    return undefined;
  }

  if (typeof tree.type !== 'string' || isHostRoot(tree.type) || !isTransparentType(tree.type)) {
    return tree;
  }

  const [child, ...rest] = childElements(tree.props.children);

  return rest.length === 0 ? rootOf(child) : undefined;
}

/**
 * The host a built tree belongs to, decided by the root the author wrote. A
 * screen's root names its host and there is no default.
 *
 * @param tree - A built tree, as the expand pass leaves it.
 * @throws ScreenRootError when the tree does not start with a host root.
 */
export function hostFor(tree: JSX.Element): HostContract {
  const root = rootOf(tree);
  const host = root === undefined ? undefined : HOSTS.find(candidate => candidate.root === root.type);

  if (host === undefined) {
    const found = root === undefined ? 'more than one element' : `\`<${describe(root)}>\``;

    throw new ScreenRootError(
      `A screen's root names its host, and this tree starts with ${found}. `
      + `Write one root at the top of the screen: ${ROOTS}.`,
    );
  }

  return host;
}

/** What the author wrote, as far as a built element tells: its component's name, or its type string. */
const describe = (element: JSX.Element): string =>
  (typeof element.type === 'function' ? element.type.name || 'Component' : element.type);

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

  if (host.id === 'chest') {
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
