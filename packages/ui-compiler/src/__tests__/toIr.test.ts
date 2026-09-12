import type { JSX } from '@bedrock-core/ui-runtime';
import { allocate, containerRoot, ContainerScreenError } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { CHEST_HOST } from '../hosts/chest';
import type { ButtonNode, IrNode, PanelNode } from '../ir';
import { chestAddressing, toIr, UnsupportedNodeError } from '../toIr';

/** Builds an element the way the build leaves it: absolute texels on props. */
const at = (
  type: string,
  [x, y, width, height]: [number, number, number, number],
  props: JSX.Props = {},
  children: JSX.Element[] = [],
): JSX.Element => ({
  type,
  props: {
    jsonUIx: x,
    jsonUIy: y,
    jsonUIWidth: width,
    jsonUIHeight: height,
    ...props,
    children,
  },
});

/** A built `<Container>` at the canvas origin. */
const container = (children: JSX.Element[], props: JSX.Props = {}, rect: [number, number, number, number] = [0, 0, 320, 210]): JSX.Element =>
  at('container', rect, { __container: { entity: 'core:test' }, ...props }, children);

/** A built `<Text>`: the string in the tail, the metrics beside it. */
const text = (
  rect: [number, number, number, number],
  tail: unknown,
  metrics: Record<string, unknown> = {},
  props: JSX.Props = {},
  type = 'text',
): JSX.Element => at(type, rect, {
  value: { tail },
  __textMetrics: { isKey: false, resolvedText: typeof tail === 'string' ? tail : '', ...metrics },
  fontType: 'default',
  fontScaleFactor: 2,
  labelX: 0,
  labelY: 0,
  ...props,
});

const options = { namespace: 'core_ui_test', collection: CHEST_HOST.collection };

/** Converts with the addressing the chest would make for the same tree. */
const convert = (tree: JSX.Element): ReturnType<typeof toIr> =>
  toIr(containerRoot(tree), chestAddressing(allocate(tree)), options);

const first = (tree: JSX.Element): IrNode => {
  const [node] = convert(tree).root.children;

  if (node === undefined) {
    throw new Error('no node');
  }

  return node;
};

const panel = (node: IrNode): PanelNode => {
  if (node.kind !== 'panel') {
    throw new Error(`expected a panel, got ${node.kind}`);
  }

  return node;
};

const buttonNode = (node: IrNode): ButtonNode => {
  if (node.kind !== 'button') {
    throw new Error(`expected a button, got ${node.kind}`);
  }

  return node;
};

describe('toIr', () => {
  it('reads the collection and the canvas off the root', () => {
    const doc = convert(container([], { background: 'textures/ui/frame' }));

    expect(doc.namespace).toBe('core_ui_test');
    expect(doc.collection).toBe(CHEST_HOST.collection);
    expect(doc.root).toMatchObject({ kind: 'panel', rect: { x: 0, y: 0, width: 320, height: 210 }, background: 'textures/ui/frame' });
    expect(doc.backdrop).toBeUndefined();
  });

  it('converts absolute layout coordinates to canvas-relative offsets', () => {
    // The solver places the root at (40, 20); a label sits at (47, 24).
    // Relative to the canvas that is (7, 4), which is what JSON UI wants.
    const doc = convert(container([text([47, 24, 162, 10], 'hi')], {}, [40, 20, 176, 83]));

    expect(doc.root.rect).toEqual({ x: 0, y: 0, width: 176, height: 83 });
    expect(doc.root.children[0]?.rect).toEqual({ x: 7, y: 4, width: 162, height: 10 });
  });

  it('nests relative to the nearest panel, not the canvas', () => {
    const inner = panel(first(container([
      at('panel', [10, 10, 100, 40], {}, [text([30, 20, 50, 10], 'inner')]),
    ]))).children[0];

    expect(inner?.rect).toEqual({ x: 20, y: 10, width: 50, height: 10 });
  });

  it('splices fragments and providers away, so a component boundary costs nothing', () => {
    const tree = at('fragment', [0, 0, 0, 0], {}, [container([
      at('fragment', [0, 0, 0, 0], {}, [text([0, 0, 10, 10], 'a'), text([0, 12, 10, 10], 'b')]),
      at('context-provider', [0, 0, 0, 0], { __context: () => undefined, value: null }, [text([0, 24, 10, 10], 'c')]),
    ])]);

    expect(convert(tree).root.children.map(node => node.name)).toEqual(['label_1', 'label_2', 'label_3']);
  });

  it('passes the author\'s draw order and visibility through', () => {
    const node = first(container([at('panel', [0, 0, 10, 10], { __layout: { zIndex: 3 }, visible: false })]));

    expect(node).toMatchObject({ layer: 3, visible: false });

    const plain = first(container([at('panel', [0, 0, 10, 10], { __layout: {} })]));

    expect(plain.layer).toBeUndefined();
    expect(plain.visible).toBeUndefined();
  });

  describe('labels', () => {
    it('maps every text variant to one kind, shadowed by type', () => {
      for (const type of ['text', 'text_shadow', 'text_wrap', 'text_shadow_wrap']) {
        const node = first(container([text([0, 0, 10, 10], 'x', {}, {}, type)]));

        expect(node.kind).toBe('text');
        expect(node.kind === 'text' && (node.shadow ?? false)).toBe(type.includes('shadow'));
      }
    });

    it('asks for a carrier only when the string is live', () => {
      const baked = first(container([text([0, 0, 10, 10], 'x')]));
      const live = first(container([text([0, 0, 10, 10], 'x', { maxLength: 8 })]));

      expect(baked.kind === 'text' && baked.address).toBeUndefined();
      expect(live.kind === 'text' && live.address).toBeTypeOf('number');
    });

    it('bakes the string with the font the label was measured with', () => {
      const node = first(container([text([7, 7, 120, 10], '§fBEDROCK CORE', {}, { fontType: 'MinecraftTen', fontScaleFactor: 1.6 })]));

      expect(node).toMatchObject({
        kind: 'text',
        text: '§fBEDROCK CORE',
        localize: false,
        fontType: 'MinecraftTen',
        fontScaleFactor: 1.6,
      });
    });

    it('localizes a label whose string is a translation key', () => {
      const node = first(container([text([0, 0, 10, 10], 'core.title', { isKey: true, resolvedText: 'Title' })]));

      expect(node).toMatchObject({ kind: 'text', text: 'core.title', localize: true });
    });

    it('bakes the resolved text of a message the client would have filled', () => {
      const node = first(container([text([0, 0, 10, 10], { rawtext: [{ text: 'x' }] }, { isKey: true, resolvedText: 'Filled' })]));

      expect(node).toMatchObject({ kind: 'text', text: 'Filled', localize: false });
    });

    it('folds the label nudge into the offset', () => {
      const node = first(container([text([10, 10, 20, 10], 'x', {}, { labelX: 1, labelY: -2 })]));

      expect(node.rect).toEqual({ x: 11, y: 8, width: 20, height: 10 });
    });

    it('draws a label the way <Text> does when the metrics are missing', () => {
      const node = first(container([at('text', [0, 0, 10, 10], { value: { tail: 'x' } })]));

      expect(node).toMatchObject({ kind: 'text', text: 'x', localize: false, fontType: 'default', fontScaleFactor: 2 });
    });

    it('turns a live label into a text run at the address the host gave it', () => {
      const tree = container([
        at('button', [0, 0, 18, 18]),
        text([0, 20, 24, 10], 'idle', { maxLength: 4 }),
      ]);
      const [, run] = convert(tree).root.children;

      // One drawn cell occupies slot 1, so the bank opens at 2.
      expect(run).toMatchObject({ kind: 'text', name: 'text_1', address: 3, length: 4, fontType: 'default' });
    });
  });

  describe('images', () => {
    it('reads the texture from the tail', () => {
      const node = first(container([at('image', [0, 0, 16, 16], { value: { tail: 'textures/ui/icon' } })]));

      expect(node).toEqual({ kind: 'image', name: 'image_1', rect: { x: 0, y: 0, width: 16, height: 16 }, texture: 'textures/ui/icon' });
    });

  });

  describe('buttons', () => {
    const button = (props: JSX.Props, children: JSX.Element[] = []): ButtonNode =>
      buttonNode(first(container([at('button', [10, 10, 60, 20], props, children)])));

    it('takes its address from the host and its look from the component', () => {
      const node = button({
        background: 't/rest',
        backgroundHover: 't/hover',
        backgroundPressed: 't/pressed',
        backgroundLocked: 't/off',
      });

      expect(node).toMatchObject({
        address: 2,
        face: { texture: 't/rest', hover: 't/hover', pressed: 't/pressed', disabled: 't/off' },
      });
    });

    it('keeps the unstyled placeholder when the author styled nothing', () => {
      const unstyled = 'textures/ui/unstyled';
      const node = button({ background: unstyled, backgroundHover: unstyled, backgroundPressed: unstyled, backgroundLocked: unstyled });

      expect(node.face).toEqual({ texture: unstyled, hover: unstyled, pressed: unstyled });
    });

    it('keeps the resting face for a disabled button unless a distinct one was given', () => {
      const node = button({ background: 't/a', backgroundHover: 't/a', backgroundPressed: 't/a', backgroundLocked: 't/a' });

      expect(node.face.disabled).toBeUndefined();
    });

    it('bakes its children relative to its own rect', () => {
      const node = button({ background: 't/a' }, [text([36, 15, 8, 10], 'Go')]);

      expect(node.children[0]).toMatchObject({ kind: 'text', text: 'Go', rect: { x: 26, y: 5, width: 8, height: 10 } });
    });

    it('is drawn the same whether or not it starts enabled', () => {
      const enabled = button({ background: 't/a', enabled: true });
      const disabled = button({ background: 't/a', enabled: false });

      expect(disabled).toEqual(enabled);
    });
  });

  describe('slots', () => {
    it('takes its address from the host, and its role and lock from the props', () => {
      const doc = convert(container([
        at('container-slot', [0, 0, 18, 18], { role: 'input' }),
        at('container-slot', [18, 0, 18, 18], { role: 'output' }),
        at('container-slot', [36, 0, 18, 18], { interactive: false }),
        at('container-slot', [54, 0, 18, 18]),
      ]));

      expect(doc.root.children).toMatchObject([
        { kind: 'slot', name: 'slot_1', address: 2, role: 'input', interactive: true },
        { kind: 'slot', name: 'slot_2', address: 3, role: 'output', interactive: true },
        { kind: 'slot', name: 'slot_3', address: 4, role: 'both', interactive: false },
        { kind: 'slot', name: 'slot_4', address: 5, role: 'both', interactive: true },
      ]);
    });

    it('reads a foreign slot from its source, and never from the allocation', () => {
      const tree = container([
        at('container-slot', [0, 0, 18, 18], { collection: 'inventory_items', index: 5, interactive: true }),
        at('container-slot', [18, 0, 18, 18], { collection: 'hotbar_items', index: 0, interactive: false }),
      ]);
      const doc = convert(tree);

      expect(doc.root.children).toMatchObject([
        { kind: 'slot', name: 'slot_1', source: { collection: 'inventory_items', index: 5, interactive: true } },
        { kind: 'slot', name: 'slot_2', source: { collection: 'hotbar_items', index: 0, interactive: false } },
      ]);
      // Nothing of the screen's own container is spent on a foreign slot.
      expect(allocate(tree).size).toBe(2);
    });
  });

  describe('grids', () => {
    it('converts a foreign grid to a grid node at its solved rect', () => {
      const doc = convert(container([
        at('slot-grid', [79, 120, 162, 54], { collection: 'inventory_items', columns: 9, rows: 3, interactive: true, hideOwned: true }),
        at('slot-grid', [79, 178, 162, 18], { collection: 'hotbar_items', columns: 9, rows: 1, interactive: true, hideOwned: false }),
      ]));

      expect(doc.root.children).toEqual([
        { kind: 'grid', name: 'grid_1', rect: { x: 79, y: 120, width: 162, height: 54 }, collection: 'inventory_items', columns: 9, rows: 3, interactive: true, hideOwned: true },
        { kind: 'grid', name: 'grid_2', rect: { x: 79, y: 178, width: 162, height: 18 }, collection: 'hotbar_items', columns: 9, rows: 1, interactive: true, hideOwned: false },
      ]);
    });

    it('spends nothing of the screen\'s own container', () => {
      const tree = container([at('slot-grid', [0, 0, 162, 18], { collection: 'hotbar_items', columns: 9, rows: 1, interactive: true, hideOwned: true })]);

      expect(allocate(tree).size).toBe(2);
    });

    it('names the host\'s owned-item renderer, so a hideOwned grid can reach it', () => {
      const tree = container([]);
      const doc = toIr(containerRoot(tree), chestAddressing(allocate(tree)), {
        ...options,
        collection: 'crate_items',
        ownedItemRenderer: 'crate.gated_item',
      });

      expect(doc.collection).toBe('crate_items');
      expect(doc.ownedItemRenderer).toBe('crate.gated_item');
    });
  });

  describe('the backdrop', () => {
    it('lifts the first <Background> out of the canvas', () => {
      const doc = convert(container([
        text([0, 0, 10, 10], 'a'),
        at('background', [0, 0, 0, 0], { __background: 'textures/ui/first' }),
        at('background', [0, 0, 0, 0], { __background: 'textures/ui/second' }),
      ]));

      expect(doc.backdrop).toBe('textures/ui/first');
      expect(doc.root.children.map(node => node.kind)).toEqual(['text']);
    });

    it('finds a <Background> nested anywhere', () => {
      const doc = convert(container([
        at('panel', [0, 0, 10, 10], {}, [at('background', [0, 0, 0, 0], { __background: 'textures/ui/deep' })]),
      ]));

      expect(doc.backdrop).toBe('textures/ui/deep');
      expect(panel(doc.root.children[0] ?? panel(doc.root)).children).toEqual([]);
    });
  });

  it('addresses every cell and channel of a mixed screen', () => {
    const tree = container([
      at('button', [0, 0, 18, 18]),
      at('container-slot', [18, 0, 18, 18]),
      text([0, 20, 24, 10], 'idle', { maxLength: 4 }),
    ]);

    // Two drawn cells after the two sentinels, then a four-character run.
    expect(allocate(tree).size).toBe(8);
    expect(convert(tree).root.children.map(node => node.kind)).toEqual(['button', 'slot', 'text']);
  });

  it('generates stable per-kind names', () => {
    const doc = convert(container([
      text([0, 0, 10, 10], 'a'),
      at('panel', [0, 0, 10, 10], {}, [text([0, 0, 10, 10], 'b')]),
      at('image', [0, 0, 10, 10], { value: { tail: 't' } }),
    ]));

    expect(doc.root.children.map(node => node.name)).toEqual(['label_1', 'panel_1', 'image_1']);
    expect(panel(doc.root.children[1] ?? doc.root).children[0]?.name).toBe('label_2');
  });

  describe('refusals', () => {
    it('names the control it cannot compile, and what it can', () => {
      const tree = container([at('slider', [0, 0, 10, 10])]);

      expect(() => convert(tree)).toThrow(UnsupportedNodeError);
      expect(() => convert(tree)).toThrow(/<slider> has no compiled form/);
      expect(() => convert(tree)).toThrow(/Panel, Text, Image, Button, Slot, SlotGrid, PlayerInventory, Hotbar, Background, Scroll/);
    });

    it('refuses a tree without a container at its root', () => {
      const tree = at('panel', [0, 0, 10, 10]);

      expect(() => convert(tree)).toThrow(ContainerScreenError);
    });

    it('refuses an allocation made from a different tree', () => {
      const tree = container([at('button', [0, 0, 18, 18])]);
      const other = container([]);

      expect(() => toIr(containerRoot(tree), chestAddressing(allocate(other)), options)).toThrow(/no cell/);
      expect(() => toIr(containerRoot(other), chestAddressing(allocate(tree)), options)).toThrow(/must see the same tree/);
    });
  });
});
