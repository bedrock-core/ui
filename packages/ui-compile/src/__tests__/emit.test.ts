import { KEY_PREFIX, TRANSPORT_ITEM_AUX } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { demoScreen } from '../__fixtures__/demo';
import { emit as emitDocument } from '../emit';
import { CHEST_EMIT } from '../hosts/chest';
import type { ButtonFace, IrDocument, IrNode } from '../ir';
import type { Control, Document } from '../jsonui';
import { child, definition, defs, eachControl, entries, find, findAll } from '../__fixtures__/helpers';

/** Every case here is a chest screen, which is the only host these node mechanisms have. */
const emit = (doc: IrDocument): Document => emitDocument(doc, CHEST_EMIT);

/** A document with the given children on a 320 x 210 canvas and nothing else. */
const screenOf = (children: IrNode[], extra: Partial<IrDocument> = {}): IrDocument => ({
  namespace: 'core_ui_test',
  collection: 'container_items',
  entity: 'core:test',
  allocation: { sentinels: 2, drawn: 0, channels: 0, size: 2 },
  root: { kind: 'panel', name: 'root', rect: { x: 0, y: 0, width: 320, height: 210 }, children },
  ...extra,
});

describe('emit', () => {
  const doc = emit(demoScreen);

  it('emits the namespace, the screen and the backdrop', () => {
    expect(doc.namespace).toBe('core_ui_demo');
    expect(definition(doc, 'screen').type).toBe('panel');
    expect(definition(doc, 'backdrop')).toEqual({
      type: 'image',
      texture: 'textures/ui/demo_backdrop',
      size: ['100%', '100%'],
      keep_ratio: false,
    });
  });

  it('emits the screen at the canvas size, with a click shield below its background', () => {
    const screen = definition(doc, 'screen');

    expect(screen.size).toEqual([320, 210]);
    expect(screen.anchor_from).toBe('top_left');
    // A click on empty canvas is caught here rather than dropping the cursor
    // item; the background is an image and passes the click through to it.
    expect(entries(screen)[0]?.[0]).toBe('core_ui_click_shield');
    expect(entries(screen)[0]?.[1]).toMatchObject({ type: 'button' });
    expect(entries(screen)[1]).toEqual(['bg', {
      type: 'image',
      texture: 'textures/ui/dialog_background_opaque',
      size: ['100%', '100%'],
      keep_ratio: false,
    }]);
  });

  it('emits only what varies per screen; the shared cells are the library\'s static files', () => {
    const names = Object.keys(defs(doc));

    for (const shared of ['slot_host', 'slot', 'locked_slot', 'output_slot', 'text_host', 'empty']) {
      expect(names, shared).not.toContain(shared);
    }

    expect(JSON.stringify(doc)).toContain('core_ui_container.slot_host');
  });

  it('never mints a bcui name', () => {
    expect(JSON.stringify(doc)).not.toContain('bcui');
  });

  describe('the host rule', () => {
    it('only ever puts collection_index on a child of a collection host', () => {
      const hosts = new Set<Control>();

      eachControl(doc, (_name, control) => {
        if (control.collection_name !== undefined) {
          hosts.add(control);
        }
      });

      // Every host is a stack_panel or a grid: nothing else accepts the property.
      for (const host of hosts) {
        expect(['stack_panel', 'grid']).toContain(host.type);
      }

      // And every indexed control is a direct child of one of them.
      const indexed = findAll(doc, () => true).filter(([, control]) => control.collection_index !== undefined);

      expect(indexed.length).toBeGreaterThan(0);

      for (const host of hosts) {
        for (const [, control] of entries(host)) {
          expect(control.collection_index).toBeDefined();
        }
      }
    });
  });

  it('never puts a $variable inside a binding expression', () => {
    eachControl(doc, (name, control) => {
      for (const binding of control.bindings ?? []) {
        expect(binding.source_property_name ?? '', `${name} source_property_name`).not.toMatch(/\$/);
        expect(binding.binding_name ?? '', `${name} binding_name`).not.toMatch(/\$/);
      }
    });
  });

  it('turns off aspect-ratio preservation on every image', () => {
    eachControl(doc, (name, control) => {
      if (control.type === 'image') {
        expect(control.keep_ratio, `${name} keep_ratio`).toBe(false);
      }
    });
  });

  it('localizes only the label that is a translation key', () => {
    const literals = findAll(doc, () => true)
      .filter(([, control]) => control.type === 'label' && !control.text?.startsWith('#'));

    expect(literals.length).toBeGreaterThan(1);

    for (const [name, control] of literals) {
      expect(control.localize, `${name} localize`).toBe(control.text === 'core.demo.subtitle');
    }
  });

  it('draws every label the way the form render pack does', () => {
    const [, title] = find(doc, name => name === 'label_1');

    expect(title).toMatchObject({
      type: 'label',
      text: '§fBEDROCK CORE',
      font_type: 'MinecraftTen',
      font_size: 'small',
      font_scale_factor: 2,
      shadow: true,
      offset: [7, 7],
      size: [120, 10],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
    });
  });

  it('gives every indexed control an explicit pixel size', () => {
    eachControl(doc, (_name, control) => {
      if (control.collection_index === undefined) {
        return;
      }

      for (const measure of control.size ?? []) {
        expect(typeof measure).toBe('number');
      }
    });
  });

  it('places slots at their solved offsets with their allocated indices', () => {
    const [, locked] = find(doc, name => name.startsWith('slot_1@'));
    const [, input] = find(doc, name => name.startsWith('slot_2@'));
    const [, plain] = find(doc, name => name.startsWith('slot_3@'));

    expect(locked).toMatchObject({ offset: [0, 0], size: [18, 18], $slot: 4, $cell: 'core_ui_container.locked_slot' });
    // An input slot rides the host's default cell, which already drops nothing.
    expect(input).toMatchObject({ offset: [22, 0], $slot: 5 });
    expect(input.$cell).toBeUndefined();
    expect(plain).toMatchObject({ offset: [44, 0], $slot: 6 });
    expect(plain.$cell).toBeUndefined();
  });

  it('emits the player\'s grids as grids over their own collections', () => {
    const [, inventory] = find(doc, name => name === 'grid_1');
    const [, hotbar] = find(doc, name => name === 'grid_2');

    expect(inventory).toMatchObject({
      type: 'grid',
      offset: [79, 125],
      size: [162, 54],
      grid_dimensions: [9, 3],
      collection_name: 'inventory_items',
      anchor_from: 'top_left',
    });
    expect(hotbar).toMatchObject({ type: 'grid', offset: [79, 183], size: [162, 18], grid_dimensions: [9, 1], collection_name: 'hotbar_items' });
  });

  it('draws an owned grid with the router\'s transport-hiding renderer', () => {
    const [, inventory] = find(doc, name => name === 'grid_1');
    const template = inventory.grid_item_template ?? '';
    const [, cell] = find(doc, name => name === `${template.slice('core_ui_demo.'.length)}@core_ui_container.cell`);

    expect(cell).toEqual({
      $item_collection_name: 'inventory_items',
      $item_renderer: 'core_ui_container.gated_item',
      $durability_bar_required: false,
    });
  });

  it('passes layer and visibility through only when set', () => {
    const [, layered] = find(doc, name => name === 'panel_1');
    const [, hidden] = find(doc, name => name === 'label_2');
    const [, plain] = find(doc, name => name === 'label_1');

    expect(layered.layer).toBe(2);
    expect(hidden.visible).toBe(false);
    expect(plain.layer).toBeUndefined();
    expect(plain.visible).toBeUndefined();
  });

  it('omits definitions for shapes the tree does not use', () => {
    expect(Object.keys(defs(emit(screenOf([]))))).toEqual(['screen']);
  });
});

describe('emit / text runs', () => {
  const run = (overrides: Record<string, unknown> = {}): Document => emit(screenOf([
    {
      kind: 'text',
      name: 'status',
      rect: { x: 7, y: 7, width: 24, height: 10 },
      channel: 1,
      length: 4,
      keyPrefix: KEY_PREFIX,
      fontType: 'default',
      fontScaleFactor: 2,
      ...overrides,
    },
  ], { allocation: { sentinels: 2, drawn: 0, channels: 4, size: 6 } }));

  /** The definition every cell instantiates, where the bindings live. */
  const textDef = (doc: Document): Control => {
    const [name] = Object.keys(defs(doc)).filter(key => key.startsWith('text_channel'));

    if (name === undefined) {
      throw new Error('no text channel definition');
    }

    return definition(doc, name);
  };

  it('draws one cell per character, on consecutive slots', () => {
    // A string arrives one character at a time because a slot carries a number,
    // not text. Consecutive slots are what let the runtime write only the cells
    // that actually changed.
    const indices = findAll(run(), name => name.startsWith('glyph@')).map(([, control]) => control.collection_index);

    expect(indices).toEqual([1, 2, 3, 4]);
  });

  it('localizes the code, which is what turns a number into a glyph', () => {
    const def = textDef(run());

    expect(def.localize).toBe(true);
    expect(def.text).toBe('#channel_text');
    expect(def.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `('${KEY_PREFIX}' + #channel_raw)`,
      target_property_name: '#channel_text',
    });
  });

  it('reads the stack size, the only value writable in place', () => {
    expect(textDef(run()).bindings).toContainEqual({
      binding_name: '#inventory_stack_count',
      binding_name_override: '#channel_raw',
      binding_type: 'collection',
      binding_collection_name: 'container_items',
    });
  });

  it('draws the cells with the label font the author chose', () => {
    const def = textDef(run({ fontType: 'MinecraftTen', fontScaleFactor: 1.6, shadow: true }));

    expect(def).toMatchObject({ font_type: 'MinecraftTen', font_size: 'small', font_scale_factor: 1.6, shadow: true });
  });

  it('shares one definition across every cell of a run', () => {
    // Bindings cannot be parameterised, but they are identical for every cell:
    // only the index differs, and an index is not a binding.
    expect(Object.keys(defs(run())).filter(key => key.startsWith('text_channel'))).toHaveLength(1);
  });

  it('puts the index on a direct child of the control declaring the collection', () => {
    // THE HOST RULE, which is why each cell costs a host as well as a label.
    const doc = run();

    expect(JSON.stringify(doc)).toContain('@core_ui_container.text_host');

    eachControl(doc, (name, control) => {
      if (control.collection_index !== undefined) {
        expect(name.startsWith('glyph@')).toBe(true);
      }
    });
  });

  it('lets the engine pack the cells, because glyph widths are not knowable', () => {
    // Which character lands in a cell is decided at runtime, so the compiler
    // cannot position them. On a fixed pitch every narrow glyph left a gap and
    // `units` came out `uni ts`.
    const doc = run();
    const [, status] = find(doc, name => name === 'status');

    expect(status.type).toBe('stack_panel');
    expect(status.orientation).toBe('horizontal');

    for (const [, cell] of findAll(doc, name => name.startsWith('cell_'))) {
      expect(cell.size).toEqual(['100%c', '100%c']);
      expect(cell.offset).toBeUndefined();
    }
  });

  it('keeps every binding literal, so none of them is dropped', () => {
    for (const binding of textDef(run()).bindings ?? []) {
      for (const value of Object.values(binding)) {
        expect(String(value).includes('$')).toBe(false);
      }
    }
  });
});

describe('emit / buttons', () => {
  const face: ButtonFace = { texture: 't/rest', hover: 't/hover', pressed: 't/pressed' };

  const button = (name: string, slot: number, look: ButtonFace, children: IrNode[] = [], x = 0): IrNode => ({
    kind: 'button',
    name,
    rect: { x, y: 0, width: 60, height: 20 },
    slot,
    face: look,
    children,
  });

  const caption = (name: string, text: string): IrNode => ({
    kind: 'label',
    name,
    rect: { x: 26, y: 5, width: 8, height: 10 },
    text,
    localize: false,
    fontType: 'default',
    fontScaleFactor: 2,
  });

  const withFace = (look: ButtonFace, children: IrNode[] = []): Document =>
    emit(screenOf([button('a', 1, look, children)], { allocation: { sentinels: 2, drawn: 1, channels: 0, size: 3 } }));

  const gatesOn = (target: Control, expression: string): void => {
    // The enabled flag is the slot holding the TRANSPORT, by its item id —
    // the guard that fills a disabled button is a different block. No channel
    // carries it.
    expect(target.bindings).toContainEqual({
      binding_name: '#item_id_aux',
      binding_name_override: '#btn_aux',
      binding_type: 'collection',
      binding_collection_name: 'container_items',
    });
    expect(target.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: expression,
      target_property_name: '#visible',
    });
  };

  const ENABLED = `(#btn_aux = ${TRANSPORT_ITEM_AUX})`;

  it('rides a slot host like any other cell, instantiating its own face', () => {
    const doc = withFace(face);
    const [name, host] = find(doc, candidate => candidate.startsWith('a@'));

    expect(name).toBe('a@core_ui_container.slot_host');
    expect(host).toMatchObject({ offset: [0, 0], size: [60, 20], $slot: 1, $cell: 'core_ui_test.button_1' });
  });

  it('hides the transport item and sizes the cell to the button', () => {
    const cell = definition(withFace(face), 'button_1');
    const enabled = child(cell, 'enabled');
    const disabled = child(cell, 'disabled');
    const item = child(enabled, 'item@core_ui_container.cell');

    // The press surface exists only while the transport is in the slot: a
    // disabled button has no button, so its guard is never auto-placed.
    gatesOn(enabled, ENABLED);
    gatesOn(disabled, `(not ${ENABLED})`);
    expect(disabled.controls).toEqual([{ 'face@core_ui_test.button_1_face': {} }]);

    expect(cell.size).toEqual([60, 20]);
    expect(item).toEqual({
      size: [60, 20],
      $cell_image_size: [60, 20],
      $item_collection_name: 'container_items',
      $background_images: 'core_ui_test.button_1_face',
      $item_renderer: 'core_ui_container.empty',
      $button_ref: 'core_ui_test.button_1_states',
      $stack_count_required: false,
      $durability_bar_required: false,
      $storage_bar_required: false,
    });
  });

  it('routes every press to auto-place and keeps the self-routed entries', () => {
    const states = definition(withFace(face), 'button_1_states@core_ui_container.slot_button');
    const routes = states.button_mappings ?? [];

    expect(routes.length).toBe(13);

    for (const route of routes) {
      if (route.from_button_id !== undefined) {
        expect(route.to_button_id).toBe('button.container_auto_place');
      }
    }

    expect(routes.map(route => route.to_button_id)).toContain('button.shape_drawing');
    expect(routes.map(route => route.to_button_id)).toContain('button.container_slot_hovered');
  });

  it('gates hover and pressed on the slot holding a transport, one level down', () => {
    const states = definition(withFace(face), 'button_1_states@core_ui_container.slot_button');

    // The gate sits on an image INSIDE the state control, never on the state
    // control itself: the button toggles that one's visibility as the pointer
    // moves, and a binding on the same control would overwrite it.
    for (const state of ['hover', 'pressed']) {
      const outer = child(states, state);

      expect(outer.type).toBe('panel');
      expect(outer.bindings).toBeUndefined();
      gatesOn(child(outer, 'image'), ENABLED);
    }

    expect(child(child(states, 'hover'), 'image').texture).toBe('t/hover');
    expect(child(child(states, 'pressed'), 'image').texture).toBe('t/pressed');
  });

  it('leaves the resting face ungated when no disabled look was given', () => {
    const facePanel = definition(withFace(face), 'button_1_face');

    expect(child(facePanel, 'bg').bindings).toBeUndefined();
    expect(child(facePanel, 'bg').texture).toBe('t/rest');
    expect(facePanel.controls?.some(entry => 'bg_disabled' in entry)).toBe(false);
  });

  it('swaps in the disabled look while the slot holds no transport', () => {
    const facePanel = definition(withFace({ ...face, disabled: 't/off' }), 'button_1_face');

    gatesOn(child(facePanel, 'bg'), ENABLED);
    gatesOn(child(facePanel, 'bg_disabled'), `(not ${ENABLED})`);
    expect(child(facePanel, 'bg_disabled').texture).toBe('t/off');
  });

  it('bakes the children into the face, above the button, at their solved offsets', () => {
    const facePanel = definition(withFace(face, [caption('label_1', 'Go')]), 'button_1_face');
    const content = child(facePanel, 'content');

    expect(content).toMatchObject({ type: 'panel', size: ['100%', '100%'], layer: 12, anchor_from: 'top_left' });
    expect(child(content, 'label_1')).toMatchObject({ type: 'label', text: 'Go', localize: false, offset: [26, 5] });
  });

  it('has no content panel when the button has nothing baked', () => {
    expect(definition(withFace(face), 'button_1_face').controls?.some(entry => 'content' in entry)).toBe(false);
  });

  it('shares one face between buttons that look the same, and not otherwise', () => {
    const same = emit(screenOf([
      button('a', 1, face, [caption('label_1', 'Go')]),
      button('b', 2, face, [caption('label_2', 'Go')], 64),
    ], { allocation: { sentinels: 2, drawn: 2, channels: 0, size: 4 } }));

    expect(Object.keys(defs(same)).filter(name => name.startsWith('button_'))).toEqual([
      'button_1_face', 'button_1_states@core_ui_container.slot_button', 'button_1',
    ]);
    expect(find(same, name => name.startsWith('b@'))[1].$cell).toBe('core_ui_test.button_1');

    const different = emit(screenOf([
      button('a', 1, face, [caption('label_1', 'Go')]),
      button('b', 2, face, [caption('label_2', 'Stop')], 64),
    ], { allocation: { sentinels: 2, drawn: 2, channels: 0, size: 4 } }));

    expect(Object.keys(defs(different)).filter(name => /^button_\d+$/.test(name))).toEqual(['button_1', 'button_2']);
    expect(find(different, name => name.startsWith('b@'))[1].$cell).toBe('core_ui_test.button_2');
  });
});

describe('emit / slot roles and locking', () => {
  const of = (role: 'both' | 'input' | 'output', interactive = true): Document => emit(screenOf(
    [{ kind: 'slot', name: 'a', rect: { x: 0, y: 0, width: 18, height: 18 }, slot: 1, role, interactive }],
    { allocation: { sentinels: 2, drawn: 1, channels: 0, size: 3 }, ownedItemRenderer: 'core_ui_container.gated_item' },
  ));

  const placed = (doc: Document): Control => child(definition(doc, 'screen'), 'a@core_ui_container.slot_host');

  it('leaves an ordinary slot on the host default, with no cell override', () => {
    expect(placed(of('both')).$cell).toBeUndefined();
  });

  it('mounts the static guard-toggled cell for an output slot', () => {
    // The real/fake pair lives in the library's static file, gated on the
    // guard's item id; the screen only points at it.
    expect(placed(of('output')).$cell).toBe('core_ui_container.output_slot');
  });

  it('mounts the static inert cell for a locked slot, outranking its role', () => {
    expect(placed(of('input', false)).$cell).toBe('core_ui_container.locked_slot');
  });

  it('emits no cell definitions of its own for the screen\'s slots', () => {
    for (const role of ['both', 'input', 'output'] as const) {
      expect(Object.keys(defs(of(role)))).toEqual(['screen']);
    }
  });
});

describe('emit / panels', () => {
  it('draws a panel background as a nineslice under its children', () => {
    const doc = emit(screenOf([{
      kind: 'panel',
      name: 'card',
      rect: { x: 10, y: 10, width: 100, height: 50 },
      background: 'textures/ui/card',
      children: [{ kind: 'image', name: 'icon', rect: { x: 4, y: 4, width: 16, height: 16 }, texture: 'textures/ui/icon' }],
    }]));
    const [, card] = find(doc, name => name === 'card');

    expect(entries(card).map(([name]) => name)).toEqual(['bg', 'icon']);
    expect(child(card, 'bg')).toEqual({ type: 'image', texture: 'textures/ui/card', size: ['100%', '100%'], keep_ratio: false });
    expect(child(card, 'icon').offset).toEqual([4, 4]);
  });

  it('draws nothing under a panel without a background', () => {
    const doc = emit(screenOf([{ kind: 'panel', name: 'box', rect: { x: 0, y: 0, width: 10, height: 10 }, children: [] }]));

    expect(find(doc, name => name === 'box')[1].controls).toEqual([]);
    expect(definition(doc, 'screen').controls?.some(entry => 'bg' in entry)).toBe(false);
  });
});

describe('emit / foreign slots', () => {
  const foreign = (source: { collection: string; index: number; interactive: boolean }): Document =>
    emit(screenOf([{
      kind: 'slot',
      name: 'a',
      rect: { x: 0, y: 0, width: 18, height: 18 },
      slot: source.index,
      role: 'both',
      interactive: source.interactive,
      source,
    }]));

  it('reads its collection at its literal index, through a host keyed by that collection', () => {
    const doc = foreign({ collection: 'inventory_items', index: 5, interactive: true });
    const [name, placed] = find(doc, candidate => candidate.startsWith('a@'));
    const host = definition(doc, 'slot_host__inventory_items');

    expect(name).toBe('a@core_ui_test.slot_host__inventory_items');
    expect(placed).toMatchObject({ offset: [0, 0], size: [18, 18], $slot: 5 });
    expect(placed.$cell).toBeUndefined();
    expect(host).toMatchObject({ type: 'stack_panel', collection_name: 'inventory_items' });
    expect(child(host, 'cell@$cell').collection_index).toBe('$slot');
    expect(child(definition(doc, 'slot__inventory_items'), 'item@core_ui_container.cell'))
      .toEqual({ $item_collection_name: 'inventory_items' });
  });

  it('does not spend the screen\'s own container defs on a foreign slot', () => {
    const doc = foreign({ collection: 'inventory_items', index: 0, interactive: true });

    expect(doc.slot_host).toBeUndefined();
    expect(doc.slot).toBeUndefined();
  });

  it('makes a display-only foreign slot inert, with no button and no focus', () => {
    const doc = foreign({ collection: 'hotbar_items', index: 2, interactive: false });
    const [, placed] = find(doc, candidate => candidate.startsWith('a@'));
    const cell = definition(doc, 'display_slot__hotbar_items');
    const item = child(cell, 'item@core_ui_container.cell');

    expect(placed.$cell).toBe('core_ui_test.display_slot__hotbar_items');
    // Inert via the library's button with no routes and no focus —
    // `focus_enabled` is a button property, so it lives there, not on the cell.
    expect(cell.focus_enabled).toBeUndefined();
    expect(item.$button_ref).toBe('core_ui_container.display_states');
    expect(JSON.stringify(cell)).not.toContain('button_mappings');
  });

  it('shares one host between two foreign slots on the same collection', () => {
    const doc = emit(screenOf([
      { kind: 'slot', name: 'a', rect: { x: 0, y: 0, width: 18, height: 18 }, slot: 0, role: 'both', interactive: true, source: { collection: 'inventory_items', index: 0, interactive: true } },
      { kind: 'slot', name: 'b', rect: { x: 18, y: 0, width: 18, height: 18 }, slot: 0, role: 'both', interactive: true, source: { collection: 'inventory_items', index: 1, interactive: true } },
    ]));

    expect(Object.keys(defs(doc)).filter(name => name.startsWith('slot_host__'))).toEqual(['slot_host__inventory_items']);
    expect(find(doc, name => name.startsWith('a@'))[1].$slot).toBe(0);
    expect(find(doc, name => name.startsWith('b@'))[1].$slot).toBe(1);
  });
});

describe('emit / grids', () => {
  const grid = (over: Partial<Extract<IrNode, { kind: 'grid' }>> = {}, extra: Partial<IrDocument> = {}): Document =>
    emit(screenOf([{
      kind: 'grid',
      name: 'g',
      rect: { x: 4, y: 8, width: 162, height: 54 },
      collection: 'inventory_items',
      columns: 9,
      rows: 3,
      interactive: true,
      hideOwned: false,
      ...over,
    }], extra));

  it('emits a JSON UI grid with the right dimensions, collection and template', () => {
    const doc = grid();
    const [, control] = find(doc, name => name === 'g');

    expect(control).toMatchObject({
      type: 'grid',
      offset: [4, 8],
      size: [162, 54],
      grid_dimensions: [9, 3],
      collection_name: 'inventory_items',
      grid_item_template: 'core_ui_test.grid_cell__inventory_items__take__plain',
    });
    expect(definition(doc, 'grid_cell__inventory_items__take__plain@core_ui_container.cell'))
      .toEqual({ $item_collection_name: 'inventory_items' });
  });

  it('draws a hideOwned grid with the host\'s transport-hiding renderer', () => {
    const doc = grid({ hideOwned: true }, { ownedItemRenderer: 'core_ui_container.gated_item' });

    expect(find(doc, name => name === 'g')[1].grid_item_template).toBe('core_ui_test.grid_cell__inventory_items__take__owned');
    expect(definition(doc, 'grid_cell__inventory_items__take__owned@core_ui_container.cell')).toEqual({
      $item_collection_name: 'inventory_items',
      $item_renderer: 'core_ui_container.gated_item',
      $durability_bar_required: false,
    });
  });

  it('withholds focus on a display-only grid, so no cell can be moved', () => {
    const doc = grid({ interactive: false });

    expect(find(doc, name => name === 'g')[1].grid_item_template).toBe('core_ui_test.grid_cell__inventory_items__display__plain');
    expect(definition(doc, 'grid_cell__inventory_items__display__plain@core_ui_container.cell')).toEqual({
      $item_collection_name: 'inventory_items',
      $button_ref: 'core_ui_container.display_states',
    });
  });
});
