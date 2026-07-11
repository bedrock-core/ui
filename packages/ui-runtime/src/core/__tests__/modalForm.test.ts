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
import { serialize, serializeModalTitle } from '../serializer';
import { collectFormButtons, formButtonTitleFields } from '../../components/Form';
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

/** Render a Form control component to its host element (no hooks needed — they are pure). */
function el(node: JSX.Element): JSX.Element {
  return node;
}

/** Build `Form.Option` children for a dropdown from plain strings (value = label). */
function ddOpts(values: string[]): JSX.Element[] {
  return values.map(v => Form.Option({ value: v, label: v }));
}

/** The native `label` payload (arg 0) for the first control of `kind`, narrowed to string. */
function labelArg(form: FakeModalForm, kind: string): string {
  const arg = form.calls.find(c => c.kind === kind)?.args[0];

  expect(typeof arg).toBe('string');

  return typeof arg === 'string' ? arg : '';
}

/** The native `items` array (arg 1) for the first control of `kind`, narrowed to string[]. */
function itemsArg(form: FakeModalForm, kind: string): string[] {
  const arg = form.calls.find(c => c.kind === kind)?.args[1];

  expect(Array.isArray(arg)).toBe(true);

  return Array.isArray(arg) ? arg.filter((v): v is string => typeof v === 'string') : [];
}

describe('modal control serialization', () => {
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

    serialize(tree, asModalForm(form), ctx);

    expect(form.calls.map(c => c.kind)).toEqual(['toggle', 'slider', 'dropdown', 'textField']);
  });

  it('passes native args through each control emitter', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Slider({ name: 'v', min: 1, max: 9, step: 2, defaultValue: 5 })), asModalForm(form), modalCtx());

    const slider = form.calls.find(c => c.kind === 'slider');

    // The native label carries the control's own serialized payload (decoded RP-side):
    // protocol header + its slot type. Range/step/default reach the native call as
    // direct args via emitSlider (read from the control's serialized props).
    const sliderLabel = slider?.args[0];

    expect(typeof sliderLabel).toBe('string');
    expect(sliderLabel).toContain(PROTOCOL_HEADER);
    expect(sliderLabel).toContain(`s:${MODAL_SLIDER_SLOT_TYPE}`);
    expect(slider?.args[1]).toBe(1);
    expect(slider?.args[2]).toBe(9);
    expect(slider?.args[3]).toMatchObject({ defaultValue: 5, valueStep: 2 });
  });

  it('encodes the control payload under its OWN control type for per-type RP decode', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Toggle({ name: 't' })), asModalForm(form), modalCtx());

    const label = form.calls.find(c => c.kind === 'toggle')?.args[0];

    // Carries the protocol header (so RP gates on it) and encodes the control's own
    // type tag — RP dispatches its decoder on this type, like the ActionForm
    // components gate on `(#type = 'image'|'text'|'panel')`.
    expect(typeof label).toBe('string');
    expect(label).toContain(PROTOCOL_HEADER);
    expect(label).toContain(`s:${MODAL_TOGGLE_SLOT_TYPE}`);
  });

  it('maps dropdown defaultValue option to its index', () => {
    const form = new FakeModalForm();

    serialize(el(Form.Dropdown({ name: 'm', children: ddOpts(['A', 'B', 'C']), defaultValue: 'C' })), asModalForm(form), modalCtx());

    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 2 });
  });

  // Step 1: the closed-box texture is now payload-driven. The `background` prop (from
  // ControlProps → withControl, field 7) must reach the serialized dropdown label so
  // the RP decode can bind it to the closed box.
  it('carries the closed-box background texture in the dropdown payload', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Dropdown({ name: 'm', children: ddOpts(['A', 'B']), background: 'textures/ui/my_closed_box' })),
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
  //
  // Per-option styling (optionBackground/hover/selected, font, scale, align, height) is NO
  // LONGER in this cell payload — it rides each option's own blob (see the per-option test
  // below). So the cell payload now ends at popupBackground [1273] + popupHeight [1356].
  it('places the closed-box + popup textures at their payload offsets', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Dropdown({
        name: 'm',
        children: ddOpts(['A', 'B']),
        background: 'textures/ui/cb_default',
        backgroundHover: 'textures/ui/cb_hover',
        backgroundPressed: 'textures/ui/cb_pressed',
        backgroundLocked: 'textures/ui/cb_locked',
        popupBackground: 'textures/ui/popup_bg',
      })),
      asModalForm(form),
      modalCtx(),
    );

    const label = labelArg(form, 'dropdown');

    expect(label.indexOf('s:textures/ui/cb_default')).toBe(440);
    expect(label.indexOf('s:textures/ui/cb_hover')).toBe(1024);
    expect(label.indexOf('s:textures/ui/cb_pressed')).toBe(1107);
    expect(label.indexOf('s:textures/ui/cb_locked')).toBe(1190);
    expect(label.indexOf('s:textures/ui/popup_bg')).toBe(1273);
    // popupHeight [1356]: 2 options × 17px + 1px fused-border overlap + 2px padding
    // (top + bottom) = 37, hugging the list. (Moved up from [1605] now that the uniform
    // option-style block left this payload.)
    expect(label.indexOf('n:37')).toBe(1356);
  });

  // Per-option payload: each option string handed to the native dropdown is a full
  // `dropdown-option` blob carrying text + row height + background states + font/scale/align,
  // decoded per-row RP-side from #custom_radio_text. Field ORDER is the RP decode contract.
  it('encodes each option as its own styled payload blob', () => {
    const form = new FakeModalForm();

    serialize(
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
      asModalForm(form),
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

    // Fixed field layout — the LABEL GROUP leads (label contract): text [92],
    // fontType [175], fontScale [258], labelX [341], labelY [424]; then height [507]
    // (legacy, always 0), bg [590], hover [673], selected [756]. Alignment is
    // TS-computed into labelX/labelY (optionLabelPosition).
    expect(alpha.indexOf('s:dropdown-option')).toBe(9);
    expect(alpha.indexOf('s:Alpha')).toBe(92);
    expect(alpha.indexOf('s:MinecraftTen')).toBe(175);
    expect(alpha.indexOf('n:3')).toBe(258); // 1.5 scale / 0.5 base
    expect(alpha.slice(341, 343)).toBe('n:'); // labelX
    expect(alpha.slice(424, 426)).toBe('n:'); // labelY
    expect(alpha.slice(507, 510)).toBe('n:0'); // legacy height slot
    expect(alpha.indexOf('s:textures/ui/opt_bg')).toBe(590);
    expect(alpha.indexOf('s:textures/ui/opt_hover')).toBe(673);
    expect(alpha.indexOf('s:textures/ui/opt_selected')).toBe(756);

    // The second option carries the SAME style but its own text.
    expect(items[1].indexOf('s:Beta')).toBe(92);
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

    serialize(group, asModalForm(form), modalCtx());

    // Reuses the native dropdown value channel: default 'blue' → index 1.
    const dropdown = form.calls.find(c => c.kind === 'dropdown');

    expect(dropdown?.args[2]).toMatchObject({ defaultValueIndex: 1 });

    // Cell payload is its own slot type (positioning of the group cell rides the control block).
    expect(labelArg(form, 'dropdown')).toContain('s:modal-inline-select');

    // First option blob: text[92], bullets[839]/[922], geometry[1005]/[1088]/[1171]/[1254].
    const [redBlob] = itemsArg(form, 'dropdown');

    expect(redBlob.indexOf('s:Red')).toBe(92);
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
  it('places the toggle textures at the contracted payload offsets', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Toggle({
        name: 't',
        background: 'textures/ui/t_off',
        backgroundHover: 'textures/ui/t_off_hov',
        backgroundPressed: 'textures/ui/t_prs',
        backgroundLocked: 'textures/ui/t_off_lock',
        checkedBackground: 'textures/ui/t_on',
        checkedHover: 'textures/ui/t_on_hov',
        checkedLocked: 'textures/ui/t_on_lock',
      })),
      asModalForm(form),
      modalCtx(),
    );

    const label = labelArg(form, 'toggle');

    expect(label.indexOf('s:textures/ui/t_off')).toBe(440);
    expect(label.indexOf('s:textures/ui/t_off_hov')).toBe(1024);
    expect(label.indexOf('s:textures/ui/t_prs')).toBe(1107);
    expect(label.indexOf('s:textures/ui/t_off_lock')).toBe(1190);
    expect(label.indexOf('s:textures/ui/t_on')).toBe(1273);
    expect(label.indexOf('s:textures/ui/t_on_hov')).toBe(1356);
    expect(label.indexOf('s:textures/ui/t_on_lock')).toBe(1439);
  });

  // Slider textures: track in the common block, then progress [1273-1438] and the
  // four thumb states [1439-1770]. Exact offsets are the RP decode contract
  // (modal_slider.json).
  it('places the slider textures at the contracted payload offsets', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Slider({
        name: 's',
        min: 0,
        max: 10,
        background: 'textures/ui/s_track',
        backgroundHover: 'textures/ui/s_track_hov',
        backgroundPressed: 'textures/ui/s_prs',
        backgroundLocked: 'textures/ui/s_lock',
        progress: 'textures/ui/s_prog',
        progressHover: 'textures/ui/s_prog_hov',
        thumb: 'textures/ui/s_thumb',
        thumbHover: 'textures/ui/s_thumb_hov',
        thumbPressed: 'textures/ui/s_thumb_prs',
        thumbLocked: 'textures/ui/s_thumb_lock',
        trackHeight: 6,
        thumbWidth: 20,
        thumbHeight: 12,
      })),
      asModalForm(form),
      modalCtx(),
    );

    const label = labelArg(form, 'slider');

    expect(label.indexOf('s:textures/ui/s_track')).toBe(440);
    expect(label.indexOf('s:textures/ui/s_track_hov')).toBe(1024);
    expect(label.indexOf('s:textures/ui/s_prs')).toBe(1107);
    expect(label.indexOf('s:textures/ui/s_lock')).toBe(1190);
    expect(label.indexOf('s:textures/ui/s_prog')).toBe(1273);
    expect(label.indexOf('s:textures/ui/s_prog_hov')).toBe(1356);
    expect(label.indexOf('s:textures/ui/s_thumb')).toBe(1439);
    expect(label.indexOf('s:textures/ui/s_thumb_hov')).toBe(1522);
    expect(label.indexOf('s:textures/ui/s_thumb_prs')).toBe(1605);
    expect(label.indexOf('s:textures/ui/s_thumb_lock')).toBe(1688);
    // Geometry block after the textures.
    expect(label.indexOf('n:6')).toBe(1771); // trackHeight
    expect(label.indexOf('n:20')).toBe(1854); // thumbWidth
    expect(label.indexOf('n:12')).toBe(1937); // thumbHeight
    // travelWidth [2020]: placeholder 0 on the serialize-only path; the layout
    // phase fills it in-place (width - thumbWidth) in the real pipeline.
    expect(label.slice(2020, 2024)).toBe('n:0;');
  });

  // Input textures: pure button-identical block ([440]/[1024]/[1107]/[1190]).
  // Exact offsets are the RP decode contract (modal_input.json).
  it('places the input textures at the contracted payload offsets', () => {
    const form = new FakeModalForm();

    serialize(
      el(Form.Input({
        name: 'i',
        background: 'textures/ui/i_bg',
        backgroundHover: 'textures/ui/i_hov',
        backgroundPressed: 'textures/ui/i_prs',
        backgroundLocked: 'textures/ui/i_lock',
      })),
      asModalForm(form),
      modalCtx(),
    );

    const label = labelArg(form, 'textField');

    expect(label.indexOf('s:textures/ui/i_bg')).toBe(440);
    expect(label.indexOf('s:textures/ui/i_hov')).toBe(1024);
    expect(label.indexOf('s:textures/ui/i_prs')).toBe(1107);
    expect(label.indexOf('s:textures/ui/i_lock')).toBe(1190);
  });

  // Form.Button blocks ride the TITLE payload after the single scroll block. Exact
  // offsets are the RP decode contract (modal_container.json flow_submit/flow_exit) —
  // if this test breaks, those decode offsets MUST be updated in lockstep.
  it('places the Form.Button blocks at the contracted title offsets', () => {
    const scroll = { axis: 'y' as const, x: 0, y: 0, width: 320, height: 210, extent: 400 };
    const submit: JSX.Element = {
      type: 'modal-form-button',
      props: {
        buttonKind: 'submit', label: 'Save',
        jsonUIWidth: 100, jsonUIHeight: 24, jsonUIx: 4, jsonUIy: 300,
        background: 'textures/ui/sb', backgroundHover: 'textures/ui/sbh',
        backgroundPressed: 'textures/ui/sbp', backgroundLocked: 'textures/ui/sbl',
      },
    };
    const exit: JSX.Element = {
      type: 'modal-form-button',
      props: {
        buttonKind: 'exit', label: 'Close',
        jsonUIWidth: 80, jsonUIHeight: 22, jsonUIx: 6, jsonUIy: 330,
        background: 'textures/ui/eb', backgroundHover: 'textures/ui/ebh',
        backgroundPressed: 'textures/ui/ebp', backgroundLocked: 'textures/ui/ebl',
      },
    };

    const title = serializeModalTitle([scroll], {
      ...formButtonTitleFields('submit', submit),
      ...formButtonTitleFields('exit', exit),
    });

    expect(title.startsWith(PROTOCOL_HEADER)).toBe(true);
    // submit block
    expect(title.indexOf('n:100')).toBe(590); // width
    expect(title.indexOf('n:24')).toBe(673); // height
    expect(title.indexOf('n:4;')).toBe(756); // x
    expect(title.indexOf('n:300')).toBe(839); // y
    expect(title.slice(922, 928)).toBe('b:true'); // visible
    expect(title.slice(930, 936)).toBe('b:true'); // enabled
    expect(title.indexOf('s:Save')).toBe(938);
    expect(title.indexOf('s:textures/ui/sb')).toBe(1021);
    expect(title.indexOf('s:textures/ui/sbh')).toBe(1104);
    expect(title.indexOf('s:textures/ui/sbp')).toBe(1187);
    expect(title.indexOf('s:textures/ui/sbl')).toBe(1270);
    // exit block
    expect(title.indexOf('n:80')).toBe(1353);
    expect(title.indexOf('n:22')).toBe(1436);
    expect(title.indexOf('n:6;')).toBe(1519);
    expect(title.indexOf('n:330')).toBe(1602);
    expect(title.slice(1685, 1691)).toBe('b:true');
    expect(title.slice(1693, 1699)).toBe('b:true');
    expect(title.indexOf('s:Close')).toBe(1701);
    expect(title.indexOf('s:textures/ui/eb')).toBe(1784);
    expect(title.indexOf('s:textures/ui/ebh')).toBe(1867);
    expect(title.indexOf('s:textures/ui/ebp')).toBe(1950);
    expect(title.indexOf('s:textures/ui/ebl')).toBe(2033);
  });

  // An undeclared exit serializes as its absent-state defaults (hidden, zeros) at
  // the same offsets, keeping the contract fixed.
  it('serializes an undeclared exit button as a hidden block at the same offsets', () => {
    const scroll = { axis: 'y' as const, x: 0, y: 0, width: 320, height: 210, extent: 400 };
    const submit: JSX.Element = {
      type: 'modal-form-button',
      props: { buttonKind: 'submit', label: 'Save', jsonUIWidth: 100, jsonUIHeight: 24, jsonUIx: 4, jsonUIy: 300 },
    };

    const title = serializeModalTitle([scroll], {
      ...formButtonTitleFields('submit', submit),
      ...formButtonTitleFields('exit', undefined),
    });

    expect(title.slice(1685, 1692)).toBe('b:false'); // exit hidden
    expect(title.slice(1353, 1357)).toBe('n:0;'); // zero geometry
  });

  // The optional <Background> field sits at the SAME fixed offset as on ActionForm
  // titles (BACKGROUND_TITLE_SKIP = 2573 after the header, 2582 absolute): the gap
  // after the exit block is padded with reserved bytes so the single static
  // core_ui_common.form_background serves both backends. Omitted when undeclared.
  it('appends the background field at the contracted title offset', () => {
    const scroll = { axis: 'y' as const, x: 0, y: 0, width: 320, height: 210, extent: 400 };
    const submit: JSX.Element = {
      type: 'modal-form-button',
      props: { buttonKind: 'submit', label: 'Save', jsonUIWidth: 100, jsonUIHeight: 24, jsonUIx: 4, jsonUIy: 300 },
    };
    const fields = (): ReturnType<typeof formButtonTitleFields> => ({
      ...formButtonTitleFields('submit', submit),
      ...formButtonTitleFields('exit', undefined),
    });

    const plain = serializeModalTitle([scroll], fields());
    const withBg = serializeModalTitle([scroll], fields(), 'textures/ui/my_bg');

    expect(serializeModalTitle([scroll], fields(), '')).toBe(plain); // empty = omitted
    // pad (2573 - 2107 = 466 bytes) + bg field (83)
    expect(withBg).toHaveLength(plain.length + 466 + 83);
    expect(withBg.indexOf('s:textures/ui/my_bg')).toBe(9 + 2573);
  });

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

  // popupHeight caps at half the canonical screen (210/2 = 105, + 2px top/bottom padding)
  // so long lists scroll.
  it('caps the computed popup height at half the screen', () => {
    const form = new FakeModalForm();
    const options = Array.from({ length: 20 }, (_, i) => `opt${i}`);

    serialize(el(Form.Dropdown({ name: 'm', children: ddOpts(options) })), asModalForm(form), modalCtx());

    const label = labelArg(form, 'dropdown');

    // popupHeight now sits at [1356] (right after popupBackground) — the uniform option-style
    // block that used to precede it moved into each option's own blob.
    expect(label.indexOf('n:107')).toBe(1356);
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
          // decorative — consumes formValues[0] = null engine-side. Needs a background:
          // a background-less panel cell renders nothing and is skipped by serialize()
          // entirely (no label emitted, no formValues slot consumed).
          el(Panel({ children: [], background: 'textures/ui/unstyled' })),
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

    const expanded = expandAndResolveContexts(tree, createInitialContext(), player);

    computeLayout(expanded);

    // The side channel is intact on the post-pipeline nodes.
    const inputs: JSX.Element[] = [];

    collect(expanded, 'modal-input', inputs);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].nativeArgs).toMatchObject({ name: 'nick', placeholder: 'type…', defaultValue: 'seed' });

    // …and it reaches the writer: serialize the survived nodes and inspect the native calls.
    const form = new FakeModalForm();
    const ctx = modalCtx();

    serialize(inputs[0], asModalForm(form), ctx);

    const dropdowns: JSX.Element[] = [];

    collect(expanded, 'modal-dropdown', dropdowns);
    serialize(dropdowns[0], asModalForm(form), ctx);

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
