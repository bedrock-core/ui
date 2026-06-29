import { describe, expect, it } from 'vitest';
import type { JSX } from '../../../jsx';
import { MODAL_FORM_SLOT_TYPE } from '../../../components/Form';
import { validateForm } from '../validateForm';

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

describe('validateForm', () => {
  it('accepts a modal tree of Form.* controls and decorative nodes', () => {
    const tree = modalTree([
      host('modal-toggle'),
      host('modal-slider'),
      host('image'),
      host('text'),
    ]);

    expect(() => validateForm(tree)).not.toThrow();
  });

  it('rejects a Button inside a Form', () => {
    const tree = modalTree([host('modal-toggle'), host('button')]);

    expect(() => validateForm(tree)).toThrow(/not allowed inside a `<Form>`/);
  });

  it('rejects an ItemRenderer inside a Form', () => {
    const tree = modalTree([host('item_renderer')]);

    expect(() => validateForm(tree)).toThrow(/not allowed inside a `<Form>`/);
  });

  it('rejects a nested Form', () => {
    const tree = modalTree([modalTree([host('modal-toggle')])]);

    expect(() => validateForm(tree)).toThrow(/cannot be nested/);
  });

  it('rejects a modal-only control used outside a Form', () => {
    const tree = host('panel', [host('modal-slider')]);

    expect(() => validateForm(tree)).toThrow(/must be rendered inside a `<Form>`/);
  });

  it('accepts an ordinary ActionForm tree with buttons', () => {
    const tree = host('panel', [host('button'), host('text'), host('item_renderer')]);

    expect(() => validateForm(tree)).not.toThrow();
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

    expect(() => validateForm(tree)).not.toThrow();
  });
});
