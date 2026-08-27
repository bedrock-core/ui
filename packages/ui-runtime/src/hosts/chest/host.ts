import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { containerEntity, containerRoot, CONTAINER_TYPE } from '../../components/Container';
import { ContainerScreenError } from '../../core/types';
import type { JSX } from '../../jsx';
import type { HostContract } from '../types';

/** A tree-derived size, coerced to a finite number. */
const size = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * What a compiled screen owes its root: exactly one `<Container>`, an entity
 * to open from, and content that fits the canvas.
 *
 * The canvas is fixed because the layout is baked: there is no second pass in
 * which something could be made to fit, so the build says what it measured and
 * where to put the overflow.
 */
const checkRoot = (tree: JSX.Element): void => {
  const root = containerRoot(tree);
  const entity = containerEntity(root);

  if (entity === undefined || entity === '') {
    throw new ContainerScreenError(
      '`<Container>` needs `entity`: the type of the entity the screen opens from, '
      + 'e.g. `core:furnace`. The build sizes that entity\'s inventory and the runtime '
      + 'serves the screen when a player interacts with it.',
    );
  }

  const width = size(root.props.jsonUIWidth);
  const height = size(root.props.jsonUIHeight);

  if (width > CANONICAL_SCREEN.width || height > CANONICAL_SCREEN.height) {
    throw new ContainerScreenError(
      `The screen's content is ${width} × ${height} and the canvas is `
      + `${CANONICAL_SCREEN.width} × ${CANONICAL_SCREEN.height}. The canvas is fixed: `
      + 'shrink something, or put the long part in a <Scroll>.',
    );
  }
};

/**
 * A custom entity's chest screen: the layout compiled at build time, and
 * everything alive in it travelling through the entity's own container slots.
 *
 * It is the only host whose screens belong to an ENTITY rather than a player —
 * one layout serves every viewer, its state lives on the entity and outlives
 * every one of them — and the only one that offers real item cells, because it
 * is the only screen with a container behind it.
 *
 * What it cannot do is as load-bearing: a chest screen reports no click, no
 * text and no veto. A press is an item taken and put straight back, a role is
 * enforced by undoing a move a tick later, and a string crosses one character
 * per slot. `enum` is absent until a screen needs one — it would be N gated
 * images on one stack size, and nothing has asked yet.
 */
export const CHEST: HostContract = {
  id: 'chest',
  label: 'container screen',
  claims: roots => roots.some(root => root.type === CONTAINER_TYPE),
  owners: ['entity', 'build'],
  canvas: CANONICAL_SCREEN,
  // A compiled screen emits a region per <Scroll>; nothing draws them from a pool.
  scrollLimit: Number.POSITIVE_INFINITY,
  compiled: true,
  offers: ['bool', 'int', 'text', 'press', 'slot', 'collection', 'exit'],

  // The only thing a chest screen cannot serve is a native form: the chest
  // screen has no typed control, no submit and no single atomic response.
  refuse: need => new ContainerScreenError(
    `\`${need.label}\` cannot be used in a container screen. A container has no native `
    + 'form; use Button and Slot for interaction.',
  ),

  check: checkRoot,
};
