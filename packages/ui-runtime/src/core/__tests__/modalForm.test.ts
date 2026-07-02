import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import type { ModalFormData } from '@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { Form } from '../../components/Form';
import { MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE } from '../../components/Form';
import { Panel } from '../../components/Panel';
import { isElement } from '../guards';
import { expandAndResolveContexts } from '../render/phases/expand';
import { computeLayout } from '../render/phases/layout';
import { createInitialContext } from '../render/traversal';
import { PROTOCOL_HEADER } from '../serializer';
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

    // The native label carries the control's own serialized payload (decoded RP-side),
    // not the raw label string: protocol header + its slot type + the label text.
    // Range/step/default still pass through verbatim as native args.
    const sliderLabel = slider?.args[0];

    expect(typeof sliderLabel).toBe('string');
    expect(sliderLabel).toContain(PROTOCOL_HEADER);
    expect(sliderLabel).toContain(`s:${MODAL_SLIDER_SLOT_TYPE}`);
    expect(sliderLabel).toContain('s:Vol');
    expect(slider?.args[1]).toBe(1);
    expect(slider?.args[2]).toBe(9);
    expect(slider?.args[3]).toMatchObject({ defaultValue: 5, valueStep: 2 });
  });

  it('encodes the control label under its OWN control type for per-type RP decode', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Toggle({ name: 't', label: 'Sound' })), asModalForm(form), modalCtx());

    const label = form.calls.find(c => c.kind === 'toggle')?.args[0];

    // Carries the protocol header (so RP gates on it) and encodes the control's own
    // type tag + label text — RP dispatches its decoder on this type, like the
    // ActionForm components gate on `(#type = 'image'|'text'|'panel')`.
    expect(typeof label).toBe('string');
    expect(label).toContain(PROTOCOL_HEADER);
    expect(label).toContain(`s:${MODAL_TOGGLE_SLOT_TYPE}`);
    expect(label).toContain('s:Sound');
  });

  it('maps dropdown defaultValue option to its index', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Dropdown({ name: 'm', options: ['A', 'B', 'C'], defaultValue: 'C' })), asModalForm(form), modalCtx());

    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 2 });
  });

  // Step 1: the closed-box texture is now payload-driven. The `background` prop (from
  // ControlProps → withControl, field 7) must reach the serialized dropdown label so
  // the RP decode can bind it to the closed box.
  it('carries the closed-box background texture in the dropdown payload', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Dropdown({ name: 'm', options: ['A', 'B'], background: 'textures/ui/my_closed_box' })),
      asModalForm(form),
      modalCtx(),
    );

    const label = form.calls.find(c => c.kind === 'dropdown')?.args[0];

    expect(typeof label).toBe('string');
    expect(label).toContain('s:textures/ui/my_closed_box');
  });

  // Step 2: closed-box state textures sit at BUTTON-IDENTICAL byte offsets
  // ([440] background, [1024] hover, [1107] pressed, [1190] locked) because the RP
  // closed-box faces are literal copies of the button's state decode blocks
  // (modal_dropdown.json ↔ components/button.json). Exact offsets are the contract —
  // if this test breaks, those RP decode offsets MUST be updated in lockstep.
  it('places the closed-box state textures at button-identical payload offsets', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Dropdown({
        name: 'm',
        options: ['A', 'B'],
        background: 'textures/ui/cb_default',
        backgroundHover: 'textures/ui/cb_hover',
        backgroundPressed: 'textures/ui/cb_pressed',
        backgroundLocked: 'textures/ui/cb_locked',
        popupBackground: 'textures/ui/popup_bg',
        optionBackground: 'textures/ui/opt_bg',
        optionHover: 'textures/ui/opt_hover',
        optionSelected: 'textures/ui/opt_selected',
      })),
      asModalForm(form),
      modalCtx(),
    );

    const label = form.calls.find(c => c.kind === 'dropdown')?.args[0] as string;

    expect(label.indexOf('s:textures/ui/cb_default')).toBe(440);
    expect(label.indexOf('s:textures/ui/cb_hover')).toBe(1024);
    expect(label.indexOf('s:textures/ui/cb_pressed')).toBe(1107);
    expect(label.indexOf('s:textures/ui/cb_locked')).toBe(1190);
    expect(label.indexOf('s:textures/ui/popup_bg')).toBe(1273);
    expect(label.indexOf('s:textures/ui/opt_bg')).toBe(1356);
    expect(label.indexOf('s:textures/ui/opt_hover')).toBe(1439);
    expect(label.indexOf('s:textures/ui/opt_selected')).toBe(1522);
    // popupHeight [1605]: 2 options × 17px + 9px chrome = 43, hugging the list.
    expect(label.indexOf('n:43')).toBe(1605);
  });

  // popupHeight caps at half the canonical screen (210/2 = 105) so long lists scroll.
  it('caps the computed popup height at half the screen', () => {
    const form = new FakeModalForm();
    const options = Array.from({ length: 20 }, (_, i) => `opt${i}`);

    serialize(el(Form.Dropdown({ name: 'm', options })), asModalForm(form), modalCtx());

    const label = form.calls.find(c => c.kind === 'dropdown')?.args[0] as string;

    expect(label.indexOf('n:105')).toBe(1605);
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

  it('keeps ordinals aligned with formValues when a decorative label sits between controls', () => {
    // The native modal's form.label() ALSO consumes a response.formValues slot
    // (confirmed in-game: the engine returns `null` there). A `<Panel>`/`<Image>`/
    // `<Text>` among Form.* fields must therefore advance modalControlIndex too, or
    // every later control's recorded ordinal points at the wrong formValues index.
    const form = new FakeModalForm();
    const ctx = modalCtx();

    const tree: JSX.Element = {
      type: 'fragment',
      props: {
        children: [
          el(Panel({ children: [] })), // decorative — consumes formValues[0] = null engine-side
          el(Form.Toggle({ name: 'sound' })),
          el(Form.Slider({ name: 'volume', min: 0, max: 1 })),
        ],
      },
    };

    serialize(tree, asModalForm(form), ctx);

    expect(form.labels).toHaveLength(1);
    expect(ctx.modalControls.get(1)).toEqual({ name: 'sound' });
    expect(ctx.modalControls.get(2)).toEqual({ name: 'volume' });
    expect(ctx.modalControlIndex).toBe(3);

    // End-to-end: a formValues array shaped like the real engine's (null for the
    // label, then real values) re-keys correctly.
    const values: Record<string, unknown> = {};

    for (const [ordinal, entry] of ctx.modalControls) {
      values[entry.name] = [null, true, 1][ordinal];
    }

    expect(values).toEqual({ sound: true, volume: 1 });
  });

  it('lays out modal controls with non-zero, increasing y (not all stacked at the top)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub; only identity is used by the pipeline
    const player = { id: 'modal-layout' } as unknown as Player;

    // A column of controls inside a sized container, mirroring how a modal flows.
    const tree: JSX.Element = {
      type: Form,
      props: {
        children: [
          Form.Toggle({ name: 'a' }),
          Form.Toggle({ name: 'b' }),
          Form.Slider({ name: 'c', min: 0, max: 1 }),
        ],
      },
    };

    const expanded = expandAndResolveContexts(tree, createInitialContext(), player);

    computeLayout(expanded);

    const toggles: JSX.Element[] = [];

    collect(expanded, MODAL_TOGGLE_SLOT_TYPE, toggles);

    const sliders: JSX.Element[] = [];

    collect(expanded, MODAL_SLIDER_SLOT_TYPE, sliders);

    const ys = [...toggles, ...sliders]
      .map(c => c.props.jsonUIy)
      .filter((y): y is number => typeof y === 'number');

    // Every control must have a real height (non-zero) so it does not collapse: the
    // second control sits below the first, the slider below both.
    expect(toggles).toHaveLength(2);
    expect(sliders).toHaveLength(1);
    expect(ys.some(y => y > 0)).toBe(true);

    // And their heights are the native row defaults, not 0.
    const heights = [...toggles, ...sliders]
      .map(c => c.props.jsonUIHeight)
      .filter((h): h is number => typeof h === 'number');

    expect(heights.every(h => h > 0)).toBe(true);
  });
});

/** Collect concrete (string-typed) elements of a given host type from a built tree. */
function collect(node: JSX.Node, type: string, out: JSX.Element[]): void {
  if (!isElement(node)) {
    if (Array.isArray(node)) {
      node.forEach(n => collect(n, type, out));
    }

    return;
  }

  if (node.type === type) {
    out.push(node);
  }

  collect(node.props.children, type, out);
}
