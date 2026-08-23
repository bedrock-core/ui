import { describe, expect, it } from 'vitest';
import { emit } from '../emit';
import { demoScreen } from '../__fixtures__/demo';
import type { Control, ControlEntry, Document } from '../jsonui';

const defs = (doc: Document): Record<string, Control> => {
  const { namespace: _namespace, ...rest } = doc;

  return rest as Record<string, Control>;
};

/** Walks every control in the document, including inline children. */
const walk = (control: Control, visit: (name: string, control: Control) => void): void => {
  for (const entry of control.controls ?? []) {
    for (const [name, child] of Object.entries(entry as ControlEntry)) {
      visit(name, child);
      walk(child, visit);
    }
  }
};

const eachControl = (doc: Document, visit: (name: string, control: Control) => void): void => {
  for (const [name, control] of Object.entries(defs(doc))) {
    visit(name, control);
    walk(control, visit);
  }
};

describe('emit', () => {
  const doc = emit(demoScreen);

  it('emits the namespace and the entry definition', () => {
    expect(doc.namespace).toBe('bcui_demo');
    expect(doc.screen).toBeDefined();
  });

  it('emits one definition per control shape, not per node', () => {
    // Nine slots, one slot definition and one host definition.
    const names = Object.keys(defs(doc));

    expect(names).toContain('slot_host');
    expect(names).toContain('slot');
    expect(names.filter((name) => name.startsWith('bay_'))).toHaveLength(0);
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
      const indexed: string[] = [];

      eachControl(doc, (name, control) => {
        if (control.collection_index !== undefined) {
          indexed.push(name);
        }
      });

      expect(indexed.length).toBeGreaterThan(0);

      for (const host of hosts) {
        for (const entry of host.controls ?? []) {
          for (const child of Object.values(entry as ControlEntry)) {
            expect(child.collection_index).toBeDefined();
          }
        }
      }
    });
  });

  it('never puts a $variable inside a binding expression', () => {
    eachControl(doc, (name, control) => {
      for (const binding of control.bindings ?? []) {
        expect(binding.source_property_name ?? '', `${name} source_property_name`)
          .not.toMatch(/\$/);
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

  it('turns off localization on literal labels', () => {
    eachControl(doc, (name, control) => {
      if (control.type === 'label') {
        expect(control.localize, `${name} localize`).toBe(false);
      }
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
    const canvas = (doc.screen as Control).controls ?? [];
    const toggle = canvas
      .map((entry) => Object.entries(entry as ControlEntry)[0])
      .find(([name]) => name.startsWith('toggle@'));

    expect(toggle).toBeDefined();
    expect(toggle?.[1].offset).toEqual([151, 14]);
    expect(toggle?.[1].$slot).toBe(1);

    const bays = canvas
      .map((entry) => Object.entries(entry as ControlEntry)[0])
      .filter(([name]) => name.startsWith('bay_'));

    expect(bays).toHaveLength(8);
    expect(bays[0]?.[1].offset).toEqual([7, 40]);
    expect(bays[7]?.[1].offset).toEqual([133, 40]);
    expect(bays[7]?.[1].$slot).toBe(9);
  });

  it('wires a clipped image to its channel slot', () => {
    const canvas = (doc.screen as Control).controls ?? [];
    const bar = canvas
      .map((entry) => Object.entries(entry as ControlEntry)[0])
      .find(([name]) => name.startsWith('fill@'));

    expect(bar?.[1].offset).toEqual([7, 20]);

    const inner = Object.values((bar?.[1].controls ?? [])[0] as ControlEntry)[0];

    expect(inner?.collection_index).toBe(10);
    expect(inner?.size).toEqual([110, 6]);
  });

  it('omits definitions for shapes the tree does not use', () => {
    const bare = emit({
      ...demoScreen,
      root: { kind: 'panel', name: 'canvas', rect: demoScreen.root.rect, children: [] },
    });

    expect(Object.keys(defs(bare))).toEqual(['screen']);
  });
});

describe('emit / text runs', () => {
  const run = (overrides: Record<string, unknown> = {}): Document => emit({
    namespace: 'demo',
    collection: 'container_items',
    entry: 'screen',
    allocation: { sentinel: 0, drawn: 0, channels: 4, size: 5 },
    root: {
      kind: 'panel',
      name: 'root',
      rect: { x: 0, y: 0, width: 176, height: 83 },
      children: [
        {
          kind: 'text',
          name: 'status',
          rect: { x: 7, y: 7, width: 24, height: 10 },
          channel: 1,
          length: 4,
          keyPrefix: 'bcui.c.',
          cellWidth: 6,
          ...overrides,
        },
      ],
    },
  });

  /** The definition every cell instantiates, where the bindings live. */
  const definition = (doc: Document): Control => {
    const [name] = Object.keys(defs(doc)).filter(key => key.startsWith('text_channel'));

    expect(name).toBeDefined();

    return defs(doc)[name as string] as Control;
  };

  it('draws one cell per character, on consecutive slots', () => {
    // A string arrives one character at a time because a slot carries a number,
    // not text. Consecutive slots are what let the runtime write only the cells
    // that actually changed.
    const indices: unknown[] = [];

    eachControl(run(), (name, control) => {
      if (name.startsWith('glyph@')) {
        indices.push(control.collection_index);
      }
    });

    expect(indices).toEqual([1, 2, 3, 4]);
  });

  it('localizes the code, which is what turns a number into a glyph', () => {
    const def = definition(run());

    expect(def.localize).toBe(true);
    expect(def.text).toBe('#channel_text');
    expect(def.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "('bcui.c.' + #channel_raw)",
      target_property_name: '#channel_text',
    });
  });

  it('reads the stack size, the only value writable in place', () => {
    expect(definition(run()).bindings).toContainEqual({
      binding_name: '#inventory_stack_count',
      binding_name_override: '#channel_raw',
      binding_type: 'collection',
      binding_collection_name: 'container_items',
    });
  });

  it('shares one definition across every cell of a run', () => {
    // Bindings cannot be parameterised, but they are identical for every cell:
    // only the index differs, and an index is not a binding.
    const names = Object.keys(defs(run())).filter(key => key.startsWith('text_channel'));

    expect(names).toHaveLength(1);
  });

  it('puts the index on a direct child of the control declaring the collection', () => {
    // THE HOST RULE, which is why each cell costs a host as well as a label.
    const doc = run();

    expect(defs(doc).text_host?.type).toBe('stack_panel');
    expect(defs(doc).text_host?.collection_name).toBe('container_items');

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
    let found: Control | undefined;

    eachControl(doc, (name, control) => {
      if (name === 'status') {
        found = control;
      }
    });

    expect(found?.type).toBe('stack_panel');
    expect(found?.orientation).toBe('horizontal');

    eachControl(doc, (name, control) => {
      if (name.startsWith('cell_')) {
        expect(control.size).toEqual(['100%c', '100%c']);
        expect(control.offset).toBeUndefined();
      }
    });
  });

  it('keeps every binding literal, so none of them is dropped', () => {
    for (const binding of definition(run()).bindings ?? []) {
      for (const value of Object.values(binding)) {
        expect(String(value).includes('$')).toBe(false);
      }
    }
  });
});

describe('emit / vanilla references', () => {
  const screen = (sized: boolean): Document => emit({
    namespace: 'demo',
    collection: 'container_items',
    entry: 'screen',
    allocation: { sentinel: 0, drawn: 0, channels: 0, size: 1 },
    root: {
      kind: 'panel',
      name: 'root',
      rect: { x: 0, y: 0, width: 176, height: 166 },
      children: [
        {
          kind: 'ref',
          name: 'inventory',
          rect: { x: 0, y: 90, width: 176, height: 76 },
          ref: 'common.inventory_panel_bottom_half_with_label',
          sized,
        },
      ],
    },
  });

  it('leaves a self-placing vanilla control entirely alone', () => {
    // Vanilla's own parts carry their anchors and offsets — the player's
    // inventory knows it belongs at the bottom — so imposing a solved box on
    // one moves it somewhere wrong.
    const entry = (screen(false).screen as Control).controls?.[0];

    expect(entry).toEqual({ 'inventory@common.inventory_panel_bottom_half_with_label': {} });
  });

  it('places one that asked to be placed', () => {
    const entry = (screen(true).screen as Control).controls?.[0] as ControlEntry;
    const control = Object.values(entry)[0];

    expect(control?.offset).toEqual([0, 90]);
    expect(control?.size).toEqual([176, 76]);
  });
});

describe('emit / slot roles', () => {
  it('leaves no trace in the layout, because roles are enforced at runtime', () => {
    // A container offers no way to veto a move, so a role cannot be expressed
    // in JSON UI at all: it travels in the generated handle and the runtime
    // undoes what it disallows a tick later.
    const of = (role: 'both' | 'input' | 'output' | 'button'): string => JSON.stringify(emit({
      namespace: 'demo',
      collection: 'container_items',
      entry: 'screen',
      allocation: { sentinel: 0, drawn: 1, channels: 0, size: 2 },
      root: {
        kind: 'panel',
        name: 'root',
        rect: { x: 0, y: 0, width: 176, height: 166 },
        children: [
          { kind: 'slot', name: 'a', rect: { x: 0, y: 0, width: 18, height: 18 }, slot: 1, role },
        ],
      },
    }));

    expect(of('input')).toBe(of('both'));
    expect(of('output')).toBe(of('both'));
    expect(of('button')).toBe(of('both'));
  });
});
