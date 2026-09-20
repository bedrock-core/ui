import { beforeAll, describe, expect, it } from 'vitest';
import { registerNativeComponents } from '../../../components';
import { MODAL_FORM_SLOT_TYPE } from '../../../components/Form';
import { SCREEN_TYPE } from '../../../components/Screen';
import { SCROLL_SLOT_TYPE } from '../../../components/Scroll';
import { SWAP_SLOT_TYPE } from '../../../components/Swap';
import { hostFor } from '../../../hosts';
import type { JSX } from '../../../jsx';
import { ScreenRootError } from '../../types';
import { validate } from '../validate';

beforeAll(() => {
  // hostFor looks through transparent wrappers, which the registry defines.
  registerNativeComponents();
});

/** Wrap children in a transparent modal-form marker (what the built Form tree looks like). */
function modalTree(children: JSX.Node): JSX.Element {
  return {
    type: MODAL_FORM_SLOT_TYPE,
    props: { __formConfig: {}, children },
  };
}

function host(type: string, children: JSX.Node = undefined): JSX.Element {
  return { type, props: { children } };
}

/** Wrap children in the action form's root marker (what a built `<Screen>` tree looks like). */
const screenTree = (children: JSX.Node): JSX.Element => host(SCREEN_TYPE, children);

/**
 * What `buildTree` does at the end: pick the host from the tree, then check it.
 * A form defaults to serialized, which is the shape most of these trees are.
 */
const check = (tree: JSX.Element, frozen = false): void => {
  validate(tree, hostFor(tree), frozen);
};

describe('validate, on the form hosts', () => {
  it('picks the host by the root: a Form marker is the modal, a Screen marker the action form', () => {
    expect(hostFor(modalTree([host('modal-toggle')])).id).toBe('form-modal');
    expect(hostFor(screenTree([host('button')])).id).toBe('form-action');
  });

  it('refuses a tree with no host root, naming the three roots', () => {
    expect(() => hostFor(host('panel', [host('button')]))).toThrow(ScreenRootError);
    expect(() => hostFor(host('panel', [host('button')]))).toThrow(/starts with `<panel>`.*<Screen>.*<Form>.*<Container entity/);
  });

  it('refuses a wrapper holding more than one element, since none of them is the root', () => {
    const tree = host('fragment', [screenTree([host('text')]), host('text')]);

    expect(() => hostFor(tree)).toThrow(/more than one element/);
  });

  it('accepts a modal tree of Form.* controls and decorative nodes', () => {
    const tree = modalTree([
      host('modal-toggle'),
      host('modal-slider'),
      host('image'),
      host('text'),
    ]);

    expect(() => check(tree)).not.toThrow();
  });

  it('rejects a Button inside a Form', () => {
    const tree = modalTree([host('modal-toggle'), host('button')]);

    expect(() => check(tree)).toThrow(/not allowed inside a `<Form>`/);
  });

  it('rejects a root below the root: a Form in a Form, a Screen in a Form, a Form in a Screen', () => {
    expect(() => check(modalTree([modalTree([host('modal-toggle')])]))).toThrow(ScreenRootError);
    expect(() => check(modalTree([modalTree([host('modal-toggle')])]))).toThrow(/`<Form>` cannot sit inside a modal form/);
    expect(() => check(modalTree([host('panel', [screenTree([host('text')])])]))).toThrow(/`<Screen>` cannot sit inside a modal form/);
    expect(() => check(screenTree([host('panel', [modalTree([host('modal-toggle')])])]))).toThrow(/`<Form>` cannot sit inside a form/);
  });

  it('rejects a modal-only control used outside a Form', () => {
    const tree = screenTree([host('panel', [host('modal-slider')])]);

    expect(() => check(tree)).toThrow(/must be rendered inside a `<Form>`/);
  });

  it('accepts an ordinary ActionForm tree with buttons', () => {
    const tree = screenTree([host('panel', [host('button'), host('text')])]);

    expect(() => check(tree)).not.toThrow();
  });

  it('rejects the container-only item controls (Slot, SlotGrid) in a form', () => {
    expect(() => check(screenTree([host('panel', [host('container-slot')])]))).toThrow(/only exists in a container screen/);
    expect(() => check(screenTree([host('panel', [host('slot-grid')])]))).toThrow(/only exists in a container screen/);
  });

  it('rejects a Container nested in a form tree: a root cannot sit below the root', () => {
    expect(() => check(screenTree([host('panel', [host('container')])]))).toThrow(/`<Container>` cannot sit inside a form/);
  });

  it('accepts a Form nested under transparent providers (navigation case)', () => {
    // The navigator renders only the active screen, wrapped in transparent
    // context-providers — so a Form-as-screen is a clean modal tree. Buttons from
    // OTHER screens are not in the tree and so cannot trip the restriction.
    const tree = host('context-provider', [
      host('context-provider', [
        modalTree([host('modal-toggle'), host('modal-slider')]),
      ]),
    ]);

    expect(hostFor(tree).id).toBe('form-modal');
    expect(() => check(tree)).not.toThrow();
  });

  it('bakes the button faces of a compiled form, so no live text may sit in one', () => {
    const live: JSX.Element = { type: 'text', props: { __textMetrics: { maxLength: 8 } } };
    const tree = screenTree([host('panel', [host('button', [live])])]);

    // A serialized form redraws per present, so a face is not baked there.
    expect(() => check(tree)).not.toThrow();

    // Compiled, the face is a definition in the pack: the string it was built
    // with is the string it draws forever.
    expect(() => check(tree, true)).toThrow(/baked into its face/);
  });

  it('lays the scroll regions of a compiled form out flat, so none may nest', () => {
    const tree = screenTree([host('panel', [host(SCROLL_SLOT_TYPE, [host(SCROLL_SLOT_TYPE)])])]);

    expect(() => check(tree)).not.toThrow();
    expect(() => check(tree, true)).toThrow(/one flat box/);
  });

  it('refuses a swap on a serialized screen, where the switch would not be free', () => {
    // Everything a swap can show is in the tree at once. Compiled, that is pack
    // size and nothing at runtime; serialized, it is N times the payload on
    // every present — which turns the one thing tabs are for into what they
    // cost.
    const tree = screenTree([host('panel', [host(SWAP_SLOT_TYPE, [host('swap-look-slot')])])]);

    expect(() => check(tree)).toThrow(/COMPILED screen/);
    expect(() => check(tree, true)).not.toThrow();
  });
});
