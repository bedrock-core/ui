import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { BUTTON_TYPE } from '../../components/Button';
import { CONTAINER_TYPE, containerEntity } from '../../components/Container';
import {
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_FORM_BUTTON_SLOT_TYPE, MODAL_FORM_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE, MODAL_OPTION_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE,
} from '../../components/Form';
import { SCROLL_SLOT_TYPE } from '../../components/Scroll';
import { isForeignSlot } from '../../components/Slot';
import { SLOT_GRID_TYPE } from '../../components/SlotGrid';
import { liveTextLength } from '../../components/Text';
import type { JSX } from '../../jsx';
import { isTransparentType } from '../componentRegistry';
import { childElements, isElement } from '../guards';
import { ContainerScreenError } from '../types';

/** Hosts a container screen has no backend for, by the name the author wrote. */
const FORM_ONLY_TYPES = new Map<string, string>([
  [MODAL_FORM_SLOT_TYPE, 'Form'],
  [MODAL_TOGGLE_SLOT_TYPE, 'Form.Toggle'],
  [MODAL_SLIDER_SLOT_TYPE, 'Form.Slider'],
  [MODAL_DROPDOWN_SLOT_TYPE, 'Form.Dropdown'],
  [MODAL_INLINE_SELECT_SLOT_TYPE, 'Form.Radio / Form.ToggleButton'],
  [MODAL_OPTION_SLOT_TYPE, 'Form.Option'],
  [MODAL_INPUT_SLOT_TYPE, 'Form.Input'],
  [MODAL_FORM_BUTTON_SLOT_TYPE, 'Form.Button'],
]);

/** Where the walk is: what a node may not contain depends on what it sits in. */
interface Scope {
  readonly insideButton: boolean;
  readonly insideScroll: boolean;
}

/** One rule a node inside a container screen must obey where it sits. Throws when it does not. */
type Rule = (node: JSX.Element, type: string, scope: Scope) => void;

/**
 * The container-screen rules, each its own entry:
 *  - No nested `<Container>`; one entity, one screen.
 *  - Nothing form-only inside it: a container has no native form, so `<Form>`
 *    and `Form.*` have nothing to become.
 *  - No `<Scroll>` inside a `<Scroll>`: a region is laid out as one flat box.
 *  - Live text (`<Text maxLength>`) not inside a `<Button>` yet: a button's
 *    children are baked into its face.
 *  - No `<SlotGrid>` or foreign `<Slot collection>` inside a `<Button>`: a
 *    button bakes a static face, and a live item cell cannot be baked.
 */
const RULES: readonly Rule[] = [
  (_node, type): void => {
    if (type === CONTAINER_TYPE) {
      throw new ContainerScreenError(
        'A `<Container>` cannot be nested inside another `<Container>`. One entity '
        + 'opens one screen; compose the inner part as a component instead.',
      );
    }
  },

  (_node, type): void => {
    const formOnly = FORM_ONLY_TYPES.get(type);

    if (formOnly !== undefined) {
      throw new ContainerScreenError(
        `\`${formOnly}\` cannot be used in a container screen. A container has no native `
        + 'form; use Button and Slot for interaction.',
      );
    }
  },

  (_node, type, scope): void => {
    if (type === SCROLL_SLOT_TYPE && scope.insideScroll) {
      throw new ContainerScreenError(
        'A `<Scroll>` cannot sit inside another `<Scroll>` in a container screen: a '
        + 'region is laid out as one flat box. Split the content into sibling scrolls.',
      );
    }
  },

  (node, _type, scope): void => {
    if (scope.insideButton && liveTextLength(node) !== undefined) {
      throw new ContainerScreenError(
        'A live `<Text maxLength>` cannot sit inside a `<Button>` yet: a button\'s '
        + 'children are baked into its face. Put the live text beside the button.',
      );
    }
  },

  (node, type, scope): void => {
    if (scope.insideButton && (type === SLOT_GRID_TYPE || isForeignSlot(node))) {
      throw new ContainerScreenError(
        'A `<SlotGrid>` or foreign `<Slot collection>` cannot sit inside a `<Button>`: a '
        + 'button bakes its children into a static face, and a live item cell cannot be '
        + 'baked. Put it beside the button.',
      );
    }
  },
];

/**
 * Enforce the container-screen rules on a built tree — the runtime backstop
 * behind the type-level guards, the way `validateForm` is for modals. Runs for
 * the build and for the entity that serves the screen alike.
 *
 * The root and the canvas are checked here; everything below the root is
 * checked against {@link RULES} where it sits.
 *  - Exactly one `<Container>` at the root, naming its entity. The root is what
 *    decides the backend, so it cannot be optional or plural.
 *  - The content fits the canvas. The canvas is fixed; what does not fit goes
 *    in a `<Scroll>`, which is laid out on its own and scrolls on the client.
 *
 * @throws ContainerScreenError on any violation.
 */
export function validateContainer(tree: JSX.Element): void {
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

  visitChildren(root, { insideButton: false, insideScroll: false });
}

/**
 * The `<Container>` a built tree renders at its root, or the reason it has
 * none. Providers and fragments above it are transparent, so they are looked
 * through the way the layout pass looks through them.
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

function concreteRoots(node: JSX.Node): JSX.Element[] {
  if (!isElement(node)) {
    return [];
  }

  if (typeof node.type === 'string' && isTransparentType(node.type)) {
    return childElements(node.props.children).flatMap(concreteRoots);
  }

  return [node];
}

function size(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function walk(node: JSX.Element, scope: Scope): void {
  const { type } = node;

  if (typeof type === 'string') {
    for (const rule of RULES) {
      rule(node, type, scope);
    }
  }

  visitChildren(node, {
    insideButton: scope.insideButton || type === BUTTON_TYPE,
    insideScroll: scope.insideScroll || type === SCROLL_SLOT_TYPE,
  });
}

function visitChildren(node: JSX.Element, scope: Scope): void {
  for (const child of childElements(node.props.children)) {
    walk(child, scope);
  }
}
