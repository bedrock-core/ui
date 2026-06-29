import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ModalFormData } from '@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { Form } from '../../components/Form';
import type { JSX } from '../../jsx';
import { serialize } from '../serializer';
import type { ModalSerializationContext } from '../types';

beforeAll(() => {
  registerNativeComponents();
});

/**
 * Records every native modal control call in order so a test can assert the
 * serialize walk produced the right typed controls with the right args.
 */
class FakeModalForm {
  readonly calls: { kind: string; args: unknown[] }[] = [];
  readonly labels: string[] = [];

  title = vi.fn();
  submitButton = vi.fn();

  label(text: string): this {
    this.labels.push(text);

    return this;
  }

  toggle(...args: unknown[]): this {
    this.calls.push({ kind: 'toggle', args });

    return this;
  }

  slider(...args: unknown[]): this {
    this.calls.push({ kind: 'slider', args });

    return this;
  }

  dropdown(...args: unknown[]): this {
    this.calls.push({ kind: 'dropdown', args });

    return this;
  }

  textField(...args: unknown[]): this {
    this.calls.push({ kind: 'textField', args });

    return this;
  }
}

function asModalForm(form: FakeModalForm): ModalFormData {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test stub
  return form as unknown as ModalFormData;
}

function modalCtx(): ModalSerializationContext {
  return { mode: 'modal', modalControls: new Map(), modalControlIndex: 0 };
}

/** Render a Form control component to its host element (no hooks needed — they are pure). */
function el(node: JSX.Element): JSX.Element {
  return node;
}

describe('modal control serialization', () => {
  it('emits one native control per Form.* child, in declaration order', () => {
    const form = new FakeModalForm();
    const ctx = modalCtx();

    const tree: JSX.Element = {
      type: 'fragment',
      props: {
        children: [
          el(Form.Toggle({ name: 'sound', label: 'Sound', defaultValue: true })),
          el(Form.Slider({ name: 'volume', label: 'Volume', min: 0, max: 10, defaultValue: 7 })),
          el(Form.Dropdown({ name: 'mode', options: ['A', 'B'], defaultValue: 'B' })),
          el(Form.Input({ name: 'nick', label: 'Name', defaultValue: 'x' })),
        ],
      },
    };

    serialize(tree, asModalForm(form), ctx);

    expect(form.calls.map(c => c.kind)).toEqual(['toggle', 'slider', 'dropdown', 'textField']);
  });

  it('passes native args through each control build callback', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Slider({ name: 'v', label: 'Vol', min: 1, max: 9, step: 2, defaultValue: 5 })), asModalForm(form), modalCtx());

    const slider = form.calls.find(c => c.kind === 'slider');

    expect(slider?.args[0]).toBe('Vol');
    expect(slider?.args[1]).toBe(1);
    expect(slider?.args[2]).toBe(9);
    expect(slider?.args[3]).toMatchObject({ defaultValue: 5, valueStep: 2 });
  });

  it('maps dropdown defaultValue option to its index', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Dropdown({ name: 'm', options: ['A', 'B', 'C'], defaultValue: 'C' })), asModalForm(form), modalCtx());

    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 2 });
  });

  it('records each control name against its ordinal', () => {
    const form = new FakeModalForm();
    const ctx = modalCtx();

    const tree: JSX.Element = {
      type: 'fragment',
      props: {
        children: [
          el(Form.Toggle({ name: 'sound' })),
          el(Form.Slider({ name: 'volume', min: 0, max: 1 })),
        ],
      },
    };

    serialize(tree, asModalForm(form), ctx);

    expect(ctx.modalControls.get(0)).toEqual({ name: 'sound' });
    expect(ctx.modalControls.get(1)).toEqual({ name: 'volume' });
    expect(ctx.modalControlIndex).toBe(2);
  });
});
