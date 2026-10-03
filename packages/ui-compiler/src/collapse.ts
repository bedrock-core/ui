import type { Control, ControlEntry, Document } from './jsonui';

const panelProperties = new Set(['type', 'size', 'offset', 'anchor_from', 'anchor_to', 'layer', 'controls']);
const relativeProperties = ['bindings', 'variables', 'collection_index', 'min_size', 'max_size',
  'contained', 'inherit_max_sibling_width', 'inherit_max_sibling_height', 'use_anchored_offset',
  'draggable', 'follows_cursor', 'property_bag'];

const pixels = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(part => typeof part === 'number' && Number.isFinite(part));

const plainPanel = (control: Control): boolean => control.type === 'panel'
  && Object.keys(control).every(key => panelProperties.has(key));

const topLeft = (control: Control): boolean => control.anchor_from === 'top_left' && control.anchor_to === 'top_left';

/** Content-sized parents and stacks depend on their direct children's boxes. */
const fixedParent = (control: Control): boolean => plainPanel(control)
  && control.size !== undefined && control.size.every(value => typeof value === 'number'
    || /^\d+(?:\.\d+)?%$/.test(value));

interface FixedControl extends Control {
  size: [number, number];
  offset: [number, number];
}

const movable = (key: string, control: Control): control is FixedControl => !key.includes('@') && control.type !== undefined
  && pixels(control.size) && pixels(control.offset) && topLeft(control)
  && (control.layer === undefined || Number.isFinite(control.layer))
  && !relativeProperties.some(key => key in control);

/** Removing an ancestor can change a binding's lookup scope even when its box is unchanged. */
const scoped = (value: unknown): boolean => {
  if (value === null || typeof value !== 'object') { return false; }

  return Object.entries(value).some(([key, item]) =>
    ((key === 'resolve_sibling_scope' || key === 'resolve_ancestor_scope') && item !== false) || scoped(item));
};

/** Remove inline layout panels while preserving each promoted child's absolute box and layer. */
export function collapsePanels(document: Document, candidates: ReadonlySet<string>): Document {
  const result = structuredClone(document);
  const referenced = new Set<string>();

  // Names may occur in bindings, state selectors or variable-supplied control paths.
  const references = (value: unknown): void => {
    if (typeof value === 'string') {
      for (const name of value.match(/[\w-]+/g) ?? []) { referenced.add(name); }
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(references);
    }
  };

  references(document);

  const visit = (parent: Control, inherited: boolean): void => {
    if (parent.controls === undefined) { return; }

    for (const entry of parent.controls) {
      for (const [key, child] of Object.entries(entry)) { visit(child, key.includes('@')); }
    }

    if (inherited || !fixedParent(parent)) { return; }

    const names = new Set(parent.controls.flatMap(entry => Object.keys(entry).map(key => key.split('@')[0])));

    parent.controls = parent.controls.flatMap((entry): ControlEntry[] => {
      const entries = Object.entries(entry);

      if (entries.length !== 1) { return [entry]; }

      const [key, panel] = entries[0];

      if (!candidates.has(key) || !plainPanel(panel) || !movable(key, panel) || referenced.has(key) || scoped(panel)) { return [entry]; }

      const children = panel.controls ?? [];
      const promoted = new Map<string, FixedControl>();

      for (const child of children) {
        const entries = Object.entries(child);

        if (entries.length !== 1) { return [entry]; }

        const [name, control] = entries[0];

        if (!movable(name, control) || referenced.has(name) || names.has(name) || promoted.has(name)) { return [entry]; }

        promoted.set(name, control);
      }

      names.delete(key);
      promoted.forEach((_control, name) => names.add(name));

      return [...promoted].map(([name, control]) => ({
        [name]: {
          ...control,
          offset: [panel.offset[0] + control.offset[0], panel.offset[1] + control.offset[1]],
          ...panel.layer === undefined ? {} : { layer: panel.layer + (control.layer ?? 0) },
        },
      }));
    });
  };

  for (const [key, control] of Object.entries(result)) {
    if (typeof control !== 'string' && !('modifications' in control)) { visit(control, key.includes('@')); }
  }

  return result;
}
