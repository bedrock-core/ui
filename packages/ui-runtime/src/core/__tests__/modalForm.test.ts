import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import type { ModalFormData } from '@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { Form } from '../../components/Form';
import { MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE } from '../../components/Form';
import { Panel } from '../../components/Panel';
import { isElement } from '../guards';
import { playerOwner } from '../fabric';
import { expandAndResolveContexts } from '../render/phases/expand';
import { computeLayout } from '../render/phases/layout';
import { createInitialContext } from '../render/traversal';
import { PROTOCOL_HEADER } from '../payload';
import type { JSX } from '../../jsx';
import { getComponentDescriptor, isTransparentType } from '../componentRegistry';
import { emitLabel } from '../writers';
import { collectFormButtons } from '../../components/Form';
import { ModalFormError, type ModalSerializationContext } from '../types';

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

/** The primitive props a writer may read; a compiled modal hands it the element's own. */
function primitives(props: JSX.Props): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(props).filter((entry): entry is [string, string | number | boolean] =>
      typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean'),
  );
}

/**
 * Write a tree the way a compiled modal does: each field through its own
 * writer, with no payload — the pack already draws everything around it — and
 * each drawn control as a bare label, which still consumes a `formValues` slot.
 */
function emit(node: JSX.Node, form: FakeModalForm, ctx: ModalSerializationContext): void {
  for (const element of (Array.isArray(node) ? node : [node]).filter(isElement)) {
    const { type, props, nativeArgs } = element;

    if (typeof type !== 'string') {
      continue;
    }

    if (isTransparentType(type)) {
      emit(props.children as JSX.Node, form, ctx);

      continue;
    }

    const writer = getComponentDescriptor(type)?.writer;

    if (writer === undefined) {
      emitLabel('', asModalForm(form), ctx);

      continue;
    }

    writer('', asModalForm(form), ctx, {}, primitives(props), nativeArgs, props.children);
  }
}

/** Render a Form control component to its host element (no hooks needed — they are pure). */
function el(node: JSX.Element): JSX.Element {
  return node;
}

/** Build `Form.Option` children for a dropdown from plain strings (value = label). */
function ddOpts(values: string[]): JSX.Element[] {
  return values.map(v => Form.Option({ value: v, label: v }));
}

/** The native `items` array (arg 1) for the first control of `kind`, narrowed to string[]. */
function itemsArg(form: FakeModalForm, kind: string): string[] {
  const arg = form.calls.find(c => c.kind === kind)?.args[1];

  expect(Array.isArray(arg)).toBe(true);

  return Array.isArray(arg) ? arg.filter((v): v is string => typeof v === 'string') : [];
}

describe("a modal's native controls", () => {
  it('emits one native control per Form.* child, in declaration order', () => {
    const form = new FakeModalForm();
    const ctx = modalCtx();

    const tree: JSX.Element = {
      type: 'fragment',
      props: {
        children: [
          el(Form.Toggle({ name: 'sound', defaultValue: true })),
          el(Form.Slider({ name: 'volume', min: 0, max: 10, defaultValue: 7 })),
          el(Form.Dropdown({ name: 'mode', children: ddOpts(['A', 'B']), defaultValue: 'B' })),
          el(Form.Input({ name: 'nick', defaultValue: 'x' })),
        ],
      },
    };

    emit(tree, form, ctx);

    expect(form.calls.map(c => c.kind)).toEqual(['toggle', 'slider', 'dropdown', 'textField']);
  });

  it('passes native args through each control emitter', () => {
    const form = new FakeModalForm();

    emit(el(Form.Slider({ name: 'v', min: 1, max: 9, step: 2, defaultValue: 5 })), form, modalCtx());

    const slider = form.calls.find(c => c.kind === 'slider');

    // Range, step and default reach the native call as direct args through
    // emitSlider; the label is bare, because the pack draws the row.
    expect(slider?.args[0]).toBe('');
    expect(slider?.args[1]).toBe(1);
    expect(slider?.args[2]).toBe(9);
    expect(slider?.args[3]).toMatchObject({ defaultValue: 5, valueStep: 2 });
  });

  it('maps dropdown defaultValue option to its index', () => {
    const form = new FakeModalForm();

    emit(el(Form.Dropdown({ name: 'm', children: ddOpts(['A', 'B', 'C']), defaultValue: 'C' })), form, modalCtx());

    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 2 });
  });

  // Step 1: the closed-box texture is now payload-driven. The `background` prop (from
  // ControlProps → withControl, field 7) must reach the serialized dropdown label so
  // the RP decode can bind it to the closed box.
  // Step 2: closed-box state textures sit at BUTTON-IDENTICAL byte offsets
  // ([440] background, [1024] hover, [1107] pressed, [1190] locked) because the RP
  // closed-box faces are literal copies of the button's state decode blocks
  // (modal_dropdown.json ↔ components/button.json). Exact offsets are the contract —
  // if this test breaks, those RP decode offsets MUST be updated in lockstep.
  //
  // Per-option styling (optionBackground/hover/selected, font, scale, align, height) is NO
  // LONGER in this cell payload — it rides each option's own blob (see the per-option test
  // below). So the cell payload now ends at popupBackground [1273] + popupHeight [1356].
  // Per-option payload: each option string handed to the native dropdown is a full
  // `dropdown-option` blob carrying text + row height + background states + font/scale/align,
  // decoded per-row RP-side from #custom_radio_text. Field ORDER is the RP decode contract.
  it('encodes each option as its own styled payload blob', () => {
    const form = new FakeModalForm();

    emit(
      el(Form.Dropdown({
        name: 'm',
        children: ddOpts(['Alpha', 'Beta']),
        optionBackground: 'textures/ui/opt_bg',
        optionHover: 'textures/ui/opt_hover',
        optionSelected: 'textures/ui/opt_selected',
        optionFont: 'minecraftTen',
        optionScale: 1.5,
        optionAlign: 'center',
      })),
      form,
      modalCtx(),
    );

    const items = itemsArg(form, 'dropdown');

    expect(items).toHaveLength(2);

    // Each entry is its own protocol-headed blob (not raw text).
    for (const blob of items) {
      expect(blob.startsWith(PROTOCOL_HEADER)).toBe(true);
      expect(blob).toContain('s:dropdown-option');
    }

    const [alpha] = items;

    // Fixed field layout — the LABEL GROUP leads (label contract, v0008 order):
    // fontType [92], fontScale [175], labelX [258], labelY [341], text [424];
    // then height [507] (legacy, always 0), bg [590], hover [673], selected
    // [756]. Alignment is TS-computed into labelX/labelY (optionLabelPosition).
    expect(alpha.indexOf('s:dropdown-option')).toBe(9);
    expect(alpha.indexOf('s:Alpha')).toBe(424);
    expect(alpha.indexOf('s:MinecraftTen')).toBe(92);
    expect(alpha.indexOf('n:3')).toBe(175); // 1.5 scale / 0.5 base
    expect(alpha.slice(258, 260)).toBe('n:'); // labelX
    expect(alpha.slice(341, 343)).toBe('n:'); // labelY
    expect(alpha.slice(507, 510)).toBe('n:0'); // legacy height slot
    expect(alpha.indexOf('s:textures/ui/opt_bg')).toBe(590);
    expect(alpha.indexOf('s:textures/ui/opt_hover')).toBe(673);
    expect(alpha.indexOf('s:textures/ui/opt_selected')).toBe(756);

    // The second option carries the SAME style but its own text.
    expect(items[1].indexOf('s:Beta')).toBe(424);
  });

  // Inline-select (radio / toggle-button) reuses the native dropdown() call. Options are now
  // `Form.Option` CHILDREN whose flex geometry (filled by the layout phase — simulated here by
  // setting jsonUI* on the built option element) is packed into each blob AFTER the bullet fields:
  // bullet[839]/bulletSel[922] then optionX[1005]/optionY[1088]/optionWidth[1171]/optionHeight[1254].
  it('emits an inline-select as a native dropdown, packing each Form.Option geometry into its blob', () => {
    const form = new FakeModalForm();

    // Build the two option children and stamp post-layout geometry (as computeLayout would).
    const red = el(Form.Option({ value: 'red', label: 'Red', bullet: 'textures/ui/radio_off', bulletSelected: 'textures/ui/radio_on' }));
    const blue = el(Form.Option({ value: 'blue', label: 'Blue', bullet: 'textures/ui/radio_off', bulletSelected: 'textures/ui/radio_on' }));

    // Distinct values per field so indexOf can't collide with an earlier identical number.
    Object.assign(red.props, { jsonUIx: 41, jsonUIy: 42, jsonUIWidth: 43, jsonUIHeight: 44 });
    Object.assign(blue.props, { jsonUIx: 51, jsonUIy: 52, jsonUIWidth: 53, jsonUIHeight: 54 });

    const group = el(Form.InlineSelect({ name: 'team', defaultValue: 'blue', children: [red, blue] }));

    emit(group, form, modalCtx());

    // Reuses the native dropdown value channel: default 'blue' → index 1.
    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 1 });

    // First option blob: text[92], bullets[839]/[922], geometry[1005]/[1088]/[1171]/[1254].
    const [redBlob] = itemsArg(form, 'dropdown');

    expect(redBlob.indexOf('s:Red')).toBe(424);
    expect(redBlob.indexOf('s:textures/ui/radio_off')).toBe(839);
    expect(redBlob.indexOf('s:textures/ui/radio_on')).toBe(922);
    expect(redBlob.indexOf('n:41')).toBe(1005); // optionX
    expect(redBlob.indexOf('n:42')).toBe(1088); // optionY
    expect(redBlob.indexOf('n:43')).toBe(1171); // optionWidth
    expect(redBlob.indexOf('n:44')).toBe(1254); // optionHeight

    // Second option carries its own geometry (genuinely per-option).
    expect(itemsArg(form, 'dropdown')[1].indexOf('n:52')).toBe(1088); // optionY
  });

  // Toggle textures: button-identical common block ([440] base=unchecked, [1024]
  // hover, [1107] pressed-reserved, [1190] locked) + checked side at [1273-1521].
  // Exact offsets are the RP decode contract (modal_toggle.json).
  // Slider textures: track in the common block, then progress [1273-1438] and the
  // four thumb states [1439-1770]. Exact offsets are the RP decode contract
  // (modal_slider.json).
  // Input textures: pure button-identical block ([440]/[1024]/[1107]/[1190]).
  // A modal has exactly two buttons, and the tree says which: one submit, and an
  // exit the author may leave out.
  it('requires exactly one submit Form.Button and at most one exit', () => {
    const btn = (kind: string): JSX.Element => ({
      type: 'modal-form-button',
      props: { buttonKind: kind, label: 'B', jsonUIWidth: 10, jsonUIHeight: 10, jsonUIx: 0, jsonUIy: 0 },
    });
    const tree = (children: JSX.Element[]): JSX.Element => ({ type: 'panel', props: { children } });

    expect(() => collectFormButtons(tree([]))).toThrow(ModalFormError);
    expect(() => collectFormButtons(tree([btn('submit'), btn('submit')]))).toThrow(ModalFormError);
    expect(() => collectFormButtons(tree([btn('submit'), btn('exit'), btn('exit')]))).toThrow(ModalFormError);
    expect(collectFormButtons(tree([btn('submit'), btn('exit')])).exit).toBeDefined();
    expect(collectFormButtons(tree([btn('submit')])).exit).toBeUndefined();
    expect(collectFormButtons(tree([btn('submit')])).submit.props.label).toBe('B');
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

    emit(tree, form, ctx);

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
          // decorative — consumes formValues[0] = null engine-side. Needs a background:
          // a background-less panel cell renders nothing and is skipped by serialize()
          // entirely (no label emitted, no formValues slot consumed).
          el(Panel({ children: [], background: 'textures/ui/unstyled' })),
          el(Form.Toggle({ name: 'sound' })),
          el(Form.Slider({ name: 'volume', min: 0, max: 1 })),
        ],
      },
    };

    emit(tree, form, ctx);

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

    const expanded = expandAndResolveContexts(tree, createInitialContext(), playerOwner(player));

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

  // The writer-only `nativeArgs` side channel must survive the render phases (expand +
  // layout rebuild nodes with fresh props; a dropped side channel would strip the native
  // args and the writer would emit an empty control). Drive the real pipeline, then
  // serialize the surviving node and assert the native call got its args.
  it('carries native args through the render pipeline to the writer', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub; only identity is used by the pipeline
    const player = { id: 'modal-nativeargs' } as unknown as Player;

    const tree: JSX.Element = {
      type: Form,
      props: {
        children: [
          Form.Input({ name: 'nick', placeholder: 'type…', defaultValue: 'seed' }),
          Form.Dropdown({ name: 'mode', children: ddOpts(['A', 'B', 'C']), defaultValue: 'C' }),
        ],
      },
    };

    const expanded = expandAndResolveContexts(tree, createInitialContext(), playerOwner(player));

    computeLayout(expanded);

    // The side channel is intact on the post-pipeline nodes.
    const inputs: JSX.Element[] = [];

    collect(expanded, 'modal-input', inputs);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].nativeArgs).toMatchObject({ name: 'nick', placeholder: 'type…', defaultValue: 'seed' });

    // …and it reaches the writer: serialize the survived nodes and inspect the native calls.
    const form = new FakeModalForm();
    const ctx = modalCtx();

    emit(inputs[0], form, ctx);

    const dropdowns: JSX.Element[] = [];

    collect(expanded, 'modal-dropdown', dropdowns);
    emit(dropdowns[0], form, ctx);

    const textField = form.calls.find(c => c.kind === 'textField');

    expect(textField?.args[1]).toBe('type…'); // placeholder
    expect(textField?.args[2]).toMatchObject({ defaultValue: 'seed' });

    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    // options resolve to blobs (arg 1) and defaultValue 'C' → index 2 (arg 2).
    expect(Array.isArray(dropdown?.args[1])).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    expect((dropdown?.args[1] as string[]).length).toBe(3);
    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 2 });
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
