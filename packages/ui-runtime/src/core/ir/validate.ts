import { BUTTON_TYPE } from '../../components/Button';
import { CONTAINER_TYPE } from '../../components/Container';
import {
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_FORM_BUTTON_SLOT_TYPE, MODAL_FORM_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE, MODAL_OPTION_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE,
} from '../../components/Form';
import { SCROLL_SLOT_TYPE } from '../../components/Scroll';
import { isForeignSlot, SLOT_TYPE } from '../../components/Slot';
import { SLOT_GRID_TYPE } from '../../components/SlotGrid';
import { liveTextLength } from '../../components/Text';
import type { Capability, HostContract } from '../../hosts';
import type { JSX } from '../../jsx';
import { childElements } from '../guards';
import { ContainerScreenError, ModalFormError } from '../types';

/**
 * The one thing a built tree is checked against: what it NEEDS, against what
 * its host OFFERS.
 *
 * There used to be a validator per backend, each a hand-kept list of which
 * component types were forbidden on it — two lists edited in opposite
 * directions every time a component or a screen was added, and neither said
 * WHY a control was refused. A need says why: a `<Slot>` asks to be interacted
 * with through a cell of the screen's own container, and a screen with no
 * container behind it has none to give. Add a host and nothing here changes;
 * add a component and it declares its need in one line.
 *
 * What is left over are rules about WHERE a control may sit rather than what
 * it needs — a scroll inside a scroll, live text inside a button's baked face.
 * Those hold because of what a screen is, not because of how a host carries
 * things, so they are listed separately below.
 */

/** What a control asks of its host, and the name the author knows it by. */
export interface Need {
  readonly capability: Capability;
  /** What the author wrote, for the message: `Form.Toggle`, not `modal-toggle`. */
  readonly label: string;
}

/**
 * One line per component that needs anything at all. Everything absent from
 * this table — panels, text, images, fragments — draws on every host, which is
 * why most of the component set is not in it.
 */
const NEEDS: ReadonlyMap<string, Need> = new Map<string, Need>([
  [SLOT_GRID_TYPE, { capability: 'collection', label: 'SlotGrid / PlayerInventory / Hotbar' }],
  [MODAL_FORM_SLOT_TYPE, { capability: 'submit', label: 'Form' }],
  [MODAL_FORM_BUTTON_SLOT_TYPE, { capability: 'submit', label: 'Form.Button' }],
  [MODAL_TOGGLE_SLOT_TYPE, { capability: 'field', label: 'Form.Toggle' }],
  [MODAL_SLIDER_SLOT_TYPE, { capability: 'field', label: 'Form.Slider' }],
  [MODAL_DROPDOWN_SLOT_TYPE, { capability: 'field', label: 'Form.Dropdown' }],
  [MODAL_INLINE_SELECT_SLOT_TYPE, { capability: 'field', label: 'Form.Radio / Form.ToggleButton' }],
  [MODAL_OPTION_SLOT_TYPE, { capability: 'field', label: 'Form.Option' }],
  [MODAL_INPUT_SLOT_TYPE, { capability: 'field', label: 'Form.Input' }],
]);

/**
 * What one element needs. Two components decide by their props rather than by
 * their type, so they are not in the table: a `<Slot>` reading a foreign
 * collection needs that collection rather than a cell of the screen's own, and
 * a `<Button>` needs a press whatever its handler goes on to do.
 */
export const needOf = (element: JSX.Element): Need | undefined => {
  const { type } = element;

  if (typeof type !== 'string') {
    return undefined;
  }

  if (type === BUTTON_TYPE) {
    return { capability: 'press', label: 'Button' };
  }

  if (type === SLOT_TYPE) {
    return isForeignSlot(element)
      ? { capability: 'collection', label: 'Slot' }
      : { capability: 'slot', label: 'Slot' };
  }

  return NEEDS.get(type);
};

/** Where the walk is: what a node may not contain depends on what it sits in. */
interface Scope {
  readonly insideContainer: boolean;
  readonly insideButton: boolean;
  readonly insideScroll: boolean;
  readonly insideModal: boolean;
}

/** One rule about where a control may sit. Throws when it sits wrong. */
type Rule = (node: JSX.Element, type: string, scope: Scope, host: HostContract) => void;

/**
 * The placement rules, each its own entry. None is about transport: they hold
 * because of what a screen IS — one root, one flat box per scroll region, a
 * button face baked at build — so they consult the host only to know whether a
 * compiled screen's stricter rules apply.
 */
const RULES: readonly Rule[] = [
  (_node, type, scope, host): void => {
    if (type !== CONTAINER_TYPE) {
      return;
    }

    if (scope.insideContainer) {
      throw new ContainerScreenError(
        'A `<Container>` cannot be nested inside another `<Container>`. One entity '
        + 'opens one screen; compose the inner part as a component instead.',
      );
    }

    if (!host.compiled) {
      throw new ContainerScreenError(
        '`<Container>` is a compiled container screen and cannot be shown with render(). '
        + 'Serve it with createContainerScreen(Screen); a player opens it by interacting '
        + 'with the entity it names.',
      );
    }
  },

  (_node, type, scope): void => {
    if (type === MODAL_FORM_SLOT_TYPE && scope.insideModal) {
      throw new ModalFormError(
        'A `<Form>` cannot be nested inside another `<Form>`. A modal is one atomic '
        + 'submit; put the fields in the same form.',
      );
    }
  },

  (_node, type, scope, host): void => {
    if (host.compiled && type === SCROLL_SLOT_TYPE && scope.insideScroll) {
      throw new ContainerScreenError(
        'A `<Scroll>` cannot sit inside another `<Scroll>` in a container screen: a '
        + 'region is laid out as one flat box. Split the content into sibling scrolls.',
      );
    }
  },

  (node, _type, scope, host): void => {
    if (host.compiled && scope.insideButton && liveTextLength(node) !== undefined) {
      throw new ContainerScreenError(
        'A live `<Text maxLength>` cannot sit inside a `<Button>` yet: a button\'s '
        + 'children are baked into its face. Put the live text beside the button.',
      );
    }
  },

  (node, type, scope, host): void => {
    if (host.compiled && scope.insideButton && (type === SLOT_GRID_TYPE || isForeignSlot(node))) {
      throw new ContainerScreenError(
        'A `<SlotGrid>` or foreign `<Slot collection>` cannot sit inside a `<Button>`: a '
        + 'button bakes its children into a static face, and a live item cell cannot be '
        + 'baked. Put it beside the button.',
      );
    }
  },
];

/**
 * Enforces the rules of the host a built tree belongs to — the runtime backstop
 * behind the type-level guards, for dynamically-built or type-escaped trees.
 * Runs for a form shown to a player and for a compiled screen alike.
 *
 * @param tree - A built tree, as the inherit pass leaves it.
 * @param host - The host it belongs to, from `hostFor`.
 * @throws ContainerScreenError or ModalFormError, naming the control and the fix.
 */
export function validate(tree: JSX.Element, host: HostContract): void {
  const offers = new Set<Capability>(host.offers);

  // Whatever the host demands of the root itself: a chest screen names the
  // entity it opens from and fits a fixed canvas, a form asks nothing.
  host.check?.(tree);

  walk(tree, { insideContainer: false, insideButton: false, insideScroll: false, insideModal: false }, host, offers);
}

function walk(node: JSX.Element, scope: Scope, host: HostContract, offers: ReadonlySet<Capability>): void {
  const { type } = node;

  if (typeof type === 'string') {
    const need = needOf(node);

    if (need !== undefined && !offers.has(need.capability)) {
      throw host.refuse(need);
    }

    for (const rule of RULES) {
      rule(node, type, scope, host);
    }
  }

  const inner: Scope = {
    insideContainer: scope.insideContainer || type === CONTAINER_TYPE,
    insideButton: scope.insideButton || type === BUTTON_TYPE,
    insideScroll: scope.insideScroll || type === SCROLL_SLOT_TYPE,
    insideModal: scope.insideModal || type === MODAL_FORM_SLOT_TYPE,
  };

  for (const child of childElements(node.props.children)) {
    walk(child, inner, host, offers);
  }
}
