import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { containerHost, containerRoot } from '../../components/Container';
import { isForeignSlot, SLOT_TYPE, slotName } from '../../components/Slot';
import { childElements } from '../../core/guards';
import { CONTAINER_TYPE } from '../../core/roots';
import { ContainerScreenError } from '../../core/types';
import type { JSX } from '../../jsx';
import type { HostContract } from '../types';

/** A tree-derived size, coerced to a finite number. */
const size = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * What the screen's own `<Slot name>` cells owe each other: a name belongs to
 * a cell the screen actually owns, and names one of them.
 *
 * Both are build-time errors because both make the lookup meaningless: a
 * foreign slot has no cell of the screen's own to reach, and a repeated name
 * would resolve to whichever cell the walk happened to reach first.
 */
const checkNames = (tree: JSX.Element): void => {
  const seen = new Set<string>();

  const visit = (element: JSX.Element): void => {
    const name = slotName(element);

    if (element.type === SLOT_TYPE && name !== undefined) {
      if (isForeignSlot(element)) {
        throw new ContainerScreenError(
          `<Slot name="${name}"> cannot be combined with \`collection\`: a name reaches a cell `
          + 'of the container the screen OWNS, and a foreign slot draws a cell of another '
          + 'collection that the screen neither allocates nor polls.',
        );
      }

      if (seen.has(name)) {
        throw new ContainerScreenError(
          `Two <Slot> cells are both named "${name}". A name reaches one cell, so it has to `
          + 'be unique within a screen: rename one, or leave both unnamed and find them by '
          + 'iterating the inventory.',
        );
      }

      seen.add(name);
    }

    for (const child of childElements(element.props.children)) {
      visit(child);
    }
  };

  visit(tree);
};

/**
 * What a compiled screen owes its root: exactly one `<Container>`, a host to
 * open from, and content that fits the canvas.
 *
 * The canvas is fixed because the layout is baked: there is no second pass in
 * which something could be made to fit, so the build says what it measured and
 * where to put the overflow.
 */
const checkRoot = (tree: JSX.Element): void => {
  const root = containerRoot(tree);

  if (containerHost(root) === undefined) {
    throw new ContainerScreenError(
      '`<Container>` needs `entity` or `block`: the type of the entity or the block the '
      + 'screen opens from, e.g. `core:furnace`. The build sizes that host\'s container and '
      + 'the runtime serves the screen when a player interacts with it.',
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

  checkNames(root);
};

/**
 * A custom entity's or a custom block's chest screen: the layout compiled at
 * build time, and everything alive in it travelling through that host's own
 * container slots.
 *
 * It is the only host whose screens belong to something in the WORLD rather
 * than to a player — one layout serves every viewer, its state lives on the
 * entity or the block and outlives every one of them — and the only one that
 * offers real item cells, because it is the only screen with a container
 * behind it.
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
  root: CONTAINER_TYPE,
  owners: ['entity', 'block', 'build'],
  canvas: CANONICAL_SCREEN,
  compiled: true,
  carriers: ['bool', 'int', 'text'],

  // Everything interactive here moves an item: a press is an item taken and put
  // straight back, so a button and a chooser's options are cells of the screen's
  // own container, and a `<Slot>` is one the player fills. The typed three are
  // absent for the same reason they are on the action form — no native form.
  mechanisms: {
    Button: 'slot',
    Toggle: 'slot',
    Select: 'slot',
    Option: 'slot',
    Slot: 'slot',
    SlotGrid: 'collection',
  },

  // The only thing a chest screen cannot serve is a native form: the chest
  // screen has no typed control, no submit and no single atomic response.
  refuse: kind => new ContainerScreenError(
    `\`${kind}\` cannot be used in a container screen. A container has no native `
    + 'form; use Button and Slot for interaction.',
  ),

  check: checkRoot,
};
