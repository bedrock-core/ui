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

  it('wires a bar to its channel slot', () => {
    const canvas = (doc.screen as Control).controls ?? [];
    const bar = canvas
      .map((entry) => Object.entries(entry as ControlEntry)[0])
      .find(([name]) => name.startsWith('charge@'));

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
