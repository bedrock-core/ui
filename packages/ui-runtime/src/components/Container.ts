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

/**
 * What a container screen opens from: a custom entity, or a custom block.
 *
 * The two are interchangeable everywhere above this — the same components, the
 * same allocation, the same protocol items and the same poll-and-undo runtime —
 * so everything that reads the host reads this pair rather than an entity type.
 */
export interface ContainerHost {
  readonly kind: 'entity' | 'block';
  /** The entity type or the block type, e.g. `core:furnace`. */
  readonly type: string;
}

export interface ContainerProps extends ControlProps {
  /**
   * Type of the entity the screen opens from, e.g. `core:furnace`. Exactly one
   * of `entity` and `block`.
   */
  entity?: string;
  /**
   * Type of the block the screen opens from, e.g. `core:workbench`. The build
   * gives that block its container and stamps the layout key on it; a player
   * opens the screen by interacting with a placed one.
   *
   * @experimental Block containers are an experimental game feature.
   */
  block?: string;
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
 * it is the one place a container screen states what it opens from.
 */
export const Container: FunctionComponent<ContainerProps> = (
  { entity, block, onOpen, onClose, children, ...rest }: ContainerProps,
): JSX.Element => HostContext({
  value: 'chest',
  children: {
    type: CONTAINER_TYPE,
    props: {
      ...withControl(rest),
      __container: hostOf(entity, block),
      onOpen,
      onClose,
      children,
    },
  },
});

/** A stated host type, once the blanks are ruled out. */
const stated = (value: string | undefined): string | undefined =>
  (typeof value === 'string' && value !== '' ? value : undefined);

/**
 * The host a `<Container>` names.
 *
 * A screen opens from one thing, and which one decides everything downstream:
 * what the build stamps, which vanilla screen the layout is routed onto, and
 * which events the runtime listens for. Naming both, or neither, has no answer
 * — so it is refused here rather than resolved to whichever was checked first.
 *
 * @throws ContainerScreenError unless exactly one of the two is named.
 */
function hostOf(entity: string | undefined, block: string | undefined): ContainerHost {
  const entityType = stated(entity);
  const blockType = stated(block);

  if (entityType !== undefined && blockType !== undefined) {
    throw new ContainerScreenError(
      `\`<Container>\` names both an entity (${entityType}) and a block (${blockType}). `
      + 'A screen opens from one host: keep the one it belongs to and drop the other.',
    );
  }

  if (entityType !== undefined) {
    return { kind: 'entity', type: entityType };
  }

  if (blockType !== undefined) {
    return { kind: 'block', type: blockType };
  }

  throw new ContainerScreenError(
    '`<Container>` needs `entity` or `block`: the type of the entity or the block the screen '
    + 'opens from, e.g. `core:furnace`. The build sizes that host\'s container and the runtime '
    + 'serves the screen when a player interacts with it.',
  );
}

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

/** The host a built `<Container>` names, read off the host element. */
export function containerHost(element: JSX.Element): ContainerHost | undefined {
  const config = element.props.__container;

  if (typeof config !== 'object' || config === null || !('kind' in config) || !('type' in config)) {
    return undefined;
  }

  const { kind, type } = config;

  if ((kind !== 'entity' && kind !== 'block') || typeof type !== 'string' || type === '') {
    return undefined;
  }

  return { kind, type };
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
