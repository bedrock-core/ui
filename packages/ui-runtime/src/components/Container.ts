import type { ContainerEvent } from '../core/events';
import { concreteRoots } from '../core/guards';
import { HostContext } from '../core/hostContext';
import { CONTAINER_TYPE } from '../core/roots';
import { ContainerScreenError } from '../core/types';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/**
 * The host `type` emitted by {@link Container}. The build and the container
 * runtime require it at the root of a screen; `render()` rejects it, because a
 * container screen is compiled ahead of time rather than serialized per player.
 */
export { CONTAINER_TYPE };

export interface ContainerProps extends ControlProps {
  /** Type of the entity the screen opens from, e.g. `core:furnace`. */
  entity: string;
  /**
   * Ran when a player opens the screen. One layout serves every viewer, so
   * this is where a screen learns who is looking and what it belongs to —
   * keep what it needs in state.
   */
  onOpen?: (event: ContainerEvent) => void;
  /** Ran when a player closes the screen, or leaves the world with it open. */
  onClose?: (event: ContainerEvent) => void;
  children?: JSX.Node;
}

/** What a built `<Container>` runs as viewers come and go. */
export interface ContainerHandlers {
  readonly onOpen?: (event: ContainerEvent) => void;
  readonly onClose?: (event: ContainerEvent) => void;
}

/**
 * Root that makes a screen a compiled container screen, the way `<Form>` makes
 * one a native modal. Its presence decides the backend: the tree is laid out
 * once at build time against the same canvas a form uses, baked into JSON UI,
 * and served by `createContainerScreen` to every player who opens the entity
 * it names. Live values travel through container slots afterwards.
 *
 * It is also the screen's own panel — every control prop applies, so a
 * `background` draws the frame and `padding`/`gap` lay the children out — and
 * it is the one place a container screen states its entity.
 */
export const Container: FunctionComponent<ContainerProps> = (
  { entity, onOpen, onClose, children, ...rest }: ContainerProps,
): JSX.Element => HostContext({
  value: 'chest',
  children: {
    type: CONTAINER_TYPE,
    props: {
      ...withControl(rest),
      __container: { entity },
      onOpen,
      onClose,
      children,
    },
  },
});

const isHandler = (value: unknown): value is (...args: unknown[]) => void => typeof value === 'function';

/**
 * The viewer handlers a built `<Container>` carries, read off the host element.
 * Who they are called with is the runtime's to check: it hands them a player
 * only after `typeId` says the entity that opened or closed the screen is one.
 */
export function containerHandlers(element: JSX.Element): ContainerHandlers {
  const { onOpen, onClose } = element.props;

  return {
    ...isHandler(onOpen) ? { onOpen } : {},
    ...isHandler(onClose) ? { onClose } : {},
  };
}

/** The entity type a built `<Container>` names, read off the host element. */
export function containerEntity(element: JSX.Element): string | undefined {
  const config = element.props.__container;

  if (typeof config !== 'object' || config === null || !('entity' in config)) {
    return undefined;
  }

  const { entity } = config;

  return typeof entity === 'string' ? entity : undefined;
}

/**
 * The `<Container>` a built tree renders at its root, or the reason it has
 * none. Providers and fragments above it are transparent, so they are looked
 * through the way every other pass looks through them.
 *
 * @throws ContainerScreenError when the tree does not render exactly one.
 */
export function containerRoot(tree: JSX.Element): JSX.Element {
  const roots = concreteRoots(tree);
  const [root] = roots;

  if (roots.length !== 1 || root === undefined || root.type !== CONTAINER_TYPE) {
    throw new ContainerScreenError(
      'A container screen must render exactly one `<Container>` at its root. The root '
      + 'is what makes the screen a compiled container screen, the way `<Form>` makes '
      + 'one a modal; put everything else inside it.',
    );
  }

  return root;
}
