import { beforeAll, describe, expect, it } from 'vitest';
import { registerNativeComponents } from '../../../components';
import { MODAL_FORM_SLOT_TYPE } from '../../../components/Form';
import { SCROLL_SLOT_TYPE } from '../../../components/Scroll';
import { hostFor } from '../../../hosts';
import type { JSX } from '../../../jsx';
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

/**
 * What `buildTree` does at the end: pick the host from the tree, then check it.
 * A form defaults to serialized, which is the shape most of these trees are.
 */
const check = (tree: JSX.Element, frozen = false): void => {
  validate(tree, hostFor(tree), frozen);
};

describe('validate, on the form hosts', () => {
  it('picks the modal host for a tree carrying a Form marker', () => {
    expect(hostFor(modalTree([host('modal-toggle')])).id).toBe('form-modal');
    expect(hostFor(host('panel', [host('button')])).id).toBe('form-action');
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

  it('rejects a nested Form', () => {
    const tree = modalTree([modalTree([host('modal-toggle')])]);

    expect(() => check(tree)).toThrow(/cannot be nested/);
  });

  it('rejects a modal-only control used outside a Form', () => {
    const tree = host('panel', [host('modal-slider')]);

    expect(() => check(tree)).toThrow(/must be rendered inside a `<Form>`/);
  });

  it('accepts an ordinary ActionForm tree with buttons', () => {
    const tree = host('panel', [host('button'), host('text')]);

    expect(() => check(tree)).not.toThrow();
  });

  it('rejects the container-only item controls (Slot, SlotGrid) in a form', () => {
    expect(() => check(host('panel', [host('container-slot')]))).toThrow(/only exists in a container screen/);
    expect(() => check(host('panel', [host('slot-grid')]))).toThrow(/only exists in a container screen/);
  });

  it('rejects a Container nested in a form tree, pointing at createContainerScreen', () => {
    expect(() => check(host('panel', [host('container')]))).toThrow(/createContainerScreen/);
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

    expect(() => check(tree)).not.toThrow();
  });

  it('bakes the button faces of a compiled form, so no live text may sit in one', () => {
    const live: JSX.Element = { type: 'text', props: { __textMetrics: { maxLength: 8 } } };
    const tree = host('panel', [host('button', [live])]);

    // A serialized form redraws per present, so a face is not baked there.
    expect(() => check(tree)).not.toThrow();

    // Compiled, the face is a definition in the pack: the string it was built
    // with is the string it draws forever.
    expect(() => check(tree, true)).toThrow(/baked into its face/);
  });

  it('lays the scroll regions of a compiled form out flat, so none may nest', () => {
    const tree = host('panel', [host(SCROLL_SLOT_TYPE, [host(SCROLL_SLOT_TYPE)])]);

    expect(() => check(tree)).not.toThrow();
    expect(() => check(tree, true)).toThrow(/one flat box/);
  });
});
