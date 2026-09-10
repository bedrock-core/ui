import { BUTTON_TYPE } from '../../components/Button';
import { EMBED_SLOT_TYPE } from '../../components/Embed';
import { EXPECT_SLOT_TYPE, expectedHost } from '../../components/Expect';
import { LIST_SLOT_TYPE } from '../../components/List';
import {
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_FORM_BUTTON_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE, MODAL_OPTION_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE,
} from '../../components/Form';
import { SCROLL_SLOT_TYPE } from '../../components/Scroll';
import { SWAP_SLOT_TYPE } from '../../components/Swap';
import { isForeignSlot, SLOT_TYPE } from '../../components/Slot';
import { SLOT_GRID_TYPE } from '../../components/SlotGrid';
import { liveTextLength } from '../../components/Text';
import type { ComponentKind, HostContract } from '../../hosts';
import type { JSX } from '../../jsx';
import { childElements } from '../guards';
import { CONTAINER_TYPE, isHostRoot, MODAL_FORM_SLOT_TYPE, SCREEN_TYPE } from '../roots';
import { ContainerScreenError, ScreenRootError } from '../types';

/**
 * The one thing a built tree is checked against: what it holds, against what
 * its host has a MECHANISM for.
 *
 * A host's mechanism table is what answers, and it answers with a reason: it
 * names what each kind of component becomes on that screen, so a kind it does
 * not name has nothing to be there. Add a host and nothing here changes; add a
 * component and it names its kind in one line.
 *
 * What is left over are rules about WHERE a control may sit rather than what
 * it becomes — a scroll inside a scroll, live text inside a button's baked
 * face. Those hold because of what a screen is, not because of how a host
 * carries things, so they are listed separately below.
 */

/**
 * One line per element type that is a component kind a host answers about.
 * Everything absent from this table — panels, text, images, fragments — draws
 * on every host and asks for nothing, which is why most of the component set
 * is not in it.
 *
 * Several types map to one kind: the modal's toggle and the plain one are both
 * a `Toggle`, and an inline select and a dropdown popup are both a `Select`,
 * because a host answers about the component the author wrote rather than
 * about the shape it was lowered to.
 */
const KINDS: ReadonlyMap<string, ComponentKind> = new Map<string, ComponentKind>([
  [SLOT_GRID_TYPE, 'SlotGrid'],
  [MODAL_FORM_SLOT_TYPE, 'Form'],
  [MODAL_FORM_BUTTON_SLOT_TYPE, 'Submit'],
  [MODAL_TOGGLE_SLOT_TYPE, 'Toggle'],
  [MODAL_SLIDER_SLOT_TYPE, 'Slider'],
  [MODAL_DROPDOWN_SLOT_TYPE, 'Dropdown'],
  [MODAL_INLINE_SELECT_SLOT_TYPE, 'Select'],
  [MODAL_OPTION_SLOT_TYPE, 'Option'],
  [MODAL_INPUT_SLOT_TYPE, 'Input'],
]);

/** The roots as the author writes them, for the nesting message. */
const LABELS: Readonly<Record<string, string>> = {
  [SCREEN_TYPE]: 'Screen',
  [MODAL_FORM_SLOT_TYPE]: 'Form',
  [CONTAINER_TYPE]: 'Container',
};

/** What kind of component one element is, or nothing when it is not one a host answers about. */
export const kindOf = (element: JSX.Element): ComponentKind | undefined => {
  const { type } = element;

  if (typeof type !== 'string') {
    return undefined;
  }

  if (type === BUTTON_TYPE) {
    return 'Button';
  }

  if (type === SLOT_TYPE) {
    return 'Slot';
  }

  return KINDS.get(type);
};

/** Where the walk is: what a node may not contain depends on what it sits in. */
interface Scope {
  /** Below the root that names the host — everything but the wrappers above it. */
  readonly insideRoot: boolean;
  readonly insideButton: boolean;
  readonly insideScroll: boolean;
}

/** One rule about where a control may sit. Throws when it sits wrong. */
type Rule = (node: JSX.Element, type: string, scope: Scope, host: HostContract, frozen: boolean) => void;

/**
 * The placement rules, each its own entry. None is about transport: they hold
 * because of what a screen IS — one root, one flat box per scroll region, a
 * button face baked at build.
 *
 * Two different questions decide which of them apply, and they are not the
 * same question. WHICH host this is, the root settles, and a second root below
 * it is refused whatever it is.
 * Whether THIS LAYOUT IS FROZEN settles what may be baked — and a compiled
 * form is frozen while its host is not the always-compiled one, so a rule that
 * asked the host would have let a live `<Text>` be baked into a form button's
 * face and silently drawn its first value forever.
 */
const RULES: readonly Rule[] = [
  (_node, type, scope, host): void => {
    if (scope.insideRoot && isHostRoot(type)) {
      throw new ScreenRootError(
        `A \`<${LABELS[type] ?? type}>\` cannot sit inside a ${host.label}: a root names the `
        + 'host of the whole screen, so there is one, at the top. Compose the inner '
        + 'part as a component, or give it a screen of its own.',
      );
    }
  },

  (node, type, _scope, host): void => {
    const expected = type === EXPECT_SLOT_TYPE ? expectedHost(node) : undefined;

    if (expected !== undefined && expected !== host.id) {
      throw new ScreenRootError(
        `This part of the screen is written for a ${expected} and is being drawn on a `
        + `${host.id}. Either give it a screen of that kind, or use components the `
        + `${host.label} can draw.`,
      );
    }
  },

  (_node, type, scope, _host, frozen): void => {
    if (frozen && type === SCROLL_SLOT_TYPE && scope.insideScroll) {
      throw new ContainerScreenError(
        'A `<Scroll>` cannot sit inside another `<Scroll>` in a compiled screen: a '
        + 'region is laid out as one flat box. Split the content into sibling scrolls.',
      );
    }
  },

  (node, _type, scope, _host, frozen): void => {
    if (frozen && scope.insideButton && liveTextLength(node) !== undefined) {
      throw new ContainerScreenError(
        'A live `<Text maxLength>` cannot sit inside a `<Button>` yet: a button\'s '
        + 'children are baked into its face. Put the live text beside the button.',
      );
    }
  },

  (_node, type, _scope, _host, frozen): void => {
    if (!frozen && type === SWAP_SLOT_TYPE) {
      throw new ContainerScreenError(
        'A `<Disclosure>` or a `<Tabs>` can only be used on a COMPILED screen: the switch is a '
        + 'toggle the client handles. A serialized screen re-renders per present, so switch with '
        + '`useState` and render the content conditionally instead.',
      );
    }
  },

  (_node, type, _scope, _host, frozen): void => {
    if (!frozen && type === EMBED_SLOT_TYPE) {
      throw new ContainerScreenError(
        '`<EmbedSlots>` can only be used on a COMPILED screen: the slots are entries another '
        + 'pack\'s compiled screen is baked against, and a serialized screen has no such entries.',
      );
    }
  },

  (_node, type, _scope, _host, frozen): void => {
    if (!frozen && type === LIST_SLOT_TYPE) {
      throw new ContainerScreenError(
        'A `<List>` can only be used on a COMPILED screen. A serialized screen '
        + 're-renders per present, so a variable count is free there: map your data '
        + 'directly instead.',
      );
    }
  },

  (_node, type, scope, _host, frozen): void => {
    if (frozen && scope.insideButton && type === LIST_SLOT_TYPE) {
      throw new ContainerScreenError(
        'A `<List>` cannot sit inside a `<Button>`: a button bakes its children into '
        + 'a static face, and a gated row cannot be baked. Put the list beside the button.',
      );
    }
  },

  (node, type, scope, _host, frozen): void => {
    if (frozen && scope.insideButton && (type === SLOT_GRID_TYPE || isForeignSlot(node))) {
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
 * @throws ContainerScreenError, ModalFormError or ScreenRootError, naming the control and the fix.
 */
export function validate(tree: JSX.Element, host: HostContract, frozen: boolean): void {
  // Whatever the host demands of the root itself: a chest screen names the
  // entity it opens from and fits a fixed canvas, a form asks nothing.
  host.check?.(tree);

  walk(tree, { insideRoot: false, insideButton: false, insideScroll: false }, host, frozen);
}

function walk(
  node: JSX.Element,
  scope: Scope,
  host: HostContract,
  frozen: boolean,
): void {
  const { type } = node;

  if (typeof type === 'string') {
    // Placement first: a root below the root is refused as a root, not as a
    // control the host happens not to offer.
    for (const rule of RULES) {
      rule(node, type, scope, host, frozen);
    }

    const kind = kindOf(node);

    if (kind !== undefined && host.mechanisms[kind] === undefined) {
      throw host.refuse(kind);
    }
  }

  const inner: Scope = {
    insideRoot: scope.insideRoot || (typeof type === 'string' && isHostRoot(type)),
    insideButton: scope.insideButton || type === BUTTON_TYPE,
    insideScroll: scope.insideScroll || type === SCROLL_SLOT_TYPE,
  };

  for (const child of childElements(node.props.children)) {
    walk(child, inner, host, frozen);
  }
}
