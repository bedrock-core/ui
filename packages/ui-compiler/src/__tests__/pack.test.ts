import { dynamicText } from '../__fixtures__/dynamicText';
import type { JSX } from '@bedrock-core/ui-runtime';
import {
  Button, Container, Embed, embedMarker, Form, Hotbar, Panel, PlayerInventory, Screen, Slot, Text, Toggle,
} from '@bedrock-core/ui-runtime';
import { IDENTITY } from '@bedrock-core/ui-runtime/compile';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';
import { buildContainerPack } from '../hosts/chest/pack';
import { buildUiPack, type CompiledUiPack } from '../pack';
import type { Control, Document } from '../jsonui';
import { child, definition } from '../__fixtures__/helpers';

const container = (kind: 'entity' | 'block'): (() => JSX.Element) => () => Container({
  ...kind === 'entity' ? { entity: 'demo:crate' } : { block: 'demo:crate' },
  children: [
    Panel({ flexDirection: 'row', children: [
      Slot({ testId: 'input', role: 'input' }), Slot({ role: 'output' }), Slot({ interactive: false }),
      Button({ testId: 'press', onPress: () => undefined, children: Text({ children: 'Press' }) }),
    ] }),
    dynamicText({ testId: 'value', maxLength: 3, children: 'Ore' }),
    PlayerInventory({}), Hotbar({}),
  ],
});

const action = (): JSX.Element => Screen({ children: Panel({ children: Button({ children: Text({ children: 'Open' }) }) }) });
const modal = (): JSX.Element => Form({ children: Panel({ children: [jsx(Toggle, { name: 'enabled' }), Form.Button({ type: 'submit', label: 'Save' })] }) });

describe('named embedded pages', () => {
  const page = (name?: string): (() => JSX.Element) => () => Screen({ children: Embed({
    name, frame: { width: 300, height: 200 }, area: { x: 100, y: 25, width: 180, height: 170 },
    children: Button({ children: Text({ children: 'Guide' }) }),
  }) });

  it('isolates the default and named pages within and across addon packs', () => {
    const markers = new Set<string>();
    for (const addon of ['alpha', 'beta']) {
      const screens = [undefined, 'framework'].map(name => compileFormScreen(page(name), { namespace: addon, name: name ?? 'page' }));
      buildUiPack(screens, addon);
      for (const [index, screen] of screens.entries()) {
        expect(screen.marker).toBe(embedMarker(addon, index === 0 ? undefined : 'framework'));
        expect(screen.entries.map(entry => entry.entry)).toEqual([1]);
        markers.add(screen.marker!);
      }
    }
    expect(markers.size).toBe(4);
  });

  it('rejects colliding markers and names that cannot be embedded in expressions', () => {
    const screens = ['a', 'b'].map(name => compileFormScreen(page(), { namespace: 'alpha', name }));
    expect(() => buildUiPack(screens, 'alpha')).toThrow(/unique name/);
    expect(() => compileFormScreen(page("bad'name"), { namespace: 'alpha', name: 'page' })).toThrow(/Invalid embedded page name/);
  });
});

const build = (addon: string): CompiledUiPack => buildUiPack([
  compileScreen(container('entity'), { namespace: addon, name: 'entity', testMetadata: true }),
  compileScreen(container('block'), { namespace: addon, name: 'block', testMetadata: true }),
  compileFormScreen(action, { namespace: addon, name: 'action' }),
  compileFormScreen(modal, { namespace: addon, name: 'modal' }),
], addon);

const documents = (pack: CompiledUiPack): Document[] => [
  ...pack.hooks.map(hook => hook.document), ...pack.documents.map(output => output.document),
  ...pack.screens.flatMap(screen => [screen.document, { namespace: screen.facesNamespace, ...screen.faces }]),
];

const vanilla = new Set([
  'common.inventory_screen_common', 'common.screen_background',
  'chest.small_chest_panel', 'chest.small_chest_panel_top_half',
  'pocket_containers.small_chest_panel', 'pocket_containers.data_driven_container_panel',
  'data_driven_container.desktop_panel', 'data_driven_container.panel_top_half',
]);

/** All literal inheritance and template-variable references must resolve in the pack or vanilla. */
const missingReferences = (docs: Document[]): string[] => {
  const definitions = new Set(docs.flatMap(doc => Object.keys(doc)
    .filter(key => key !== 'namespace').map(key => `${doc.namespace}.${key.split('@')[0]}`)));
  const missing: string[] = [];
  const check = (reference: string, namespace: string): void => {
    const name = reference.replace(/^@/, '');
    if (name.startsWith('$')) return;
    const qualified = name.includes('.') ? name : `${namespace}.${name}`;
    if (!definitions.has(qualified) && !vanilla.has(qualified)) missing.push(qualified);
  };
  const walk = (value: unknown, namespace: string, reference = false): void => {
    if (typeof value === 'string') {
      if (reference && /^@?[A-Za-z_][\w-]*\.[\w-]+$/.test(value)) check(value, namespace);
      return;
    }
    if (Array.isArray(value)) { value.forEach(item => walk(item, namespace, reference)); return; }
    if (value === null || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key.includes('@')) check(key.slice(key.indexOf('@') + 1), namespace);
      walk(item, namespace, reference || key.startsWith('$') || ['control_name', 'control_ids', 'grid_item_template'].includes(key));
    }
  };
  docs.forEach(doc => walk(doc, doc.namespace));
  return missing;
};

/** Resolves emitted inheritance and cell variables before summing parent-relative layers. */
const renderedLayers = (docs: readonly Document[], root: string): { path: string; layer: number }[] => {
  const definitions = new Map<string, { base?: string; control: Control }>();
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      if (typeof value === 'string' || 'modifications' in value) continue;
      const [name, base] = key.split('@');
      definitions.set(String(doc.namespace) + '.' + name, { base, control: value });
    }
  }
  const inherit = (reference: string, override: Control): Control => {
    const found = definitions.get(reference);
    return found === undefined ? override : { ...inherit(found.base ?? '', found.control), ...override };
  };
  const layers: { path: string; layer: number }[] = [];
  const visit = (reference: string, override: Control, variables: Record<string, unknown>, parent: number, path: string): void => {
    const resolved = inherit(String(variables[reference] ?? reference), override);
    const defaults = Object.fromEntries(Object.entries(resolved)
      .filter(([key]) => key.endsWith('|default')).map(([key, value]) => [key.slice(0, -8), value]));
    const local = Object.fromEntries(Object.entries(resolved).filter(([key]) => key.startsWith('$') && !key.endsWith('|default')));
    const vars = { ...defaults, ...variables, ...local };
    const ownLayer: unknown = resolved.layer;
    const layer = parent + Number(typeof ownLayer === 'string' ? vars[ownLayer] ?? 0 : ownLayer ?? 0);
    layers.push({ path, layer });
    if (resolved.grid_item_template !== undefined) visit(resolved.grid_item_template, {}, vars, layer, path + '/cell');
    for (const entry of resolved.controls ?? []) {
      for (const [key, childControl] of Object.entries(entry)) {
        const [name, base = ''] = key.split('@');
        visit(base, childControl, vars, layer, path + '/' + name);
      }
    }
  };
  visit(root, {}, {}, 0, root);
  return layers;
};

describe('compiled packs with form and native container hosts', () => {
  it('resolves every helper without shared UI JSON and emits mixed support once', () => {
    const pack = build('alpha');
    const docs = documents(pack);
    expect(missingReferences(docs)).toEqual([]);
    expect(JSON.stringify(docs)).not.toMatch(/core_ui_(?:chest|router|common|components|form_components|shapes)\./);
    expect(pack.hooks.map(hook => hook.file)).toEqual(['ui/chest_screen.json', 'ui/data_driven_container_screen.json', 'ui/server_form.json']);
    const helpers = pack.documents.filter(output => output.file.startsWith('ui/core-ui/support/'));
    expect(helpers).toHaveLength(1);
    expect(helpers[0]!.document).toHaveProperty('core_ui_chest_slot_button');
    expect(helpers[0]!.document).toHaveProperty('core_ui_chest_text_host');
    expect(helpers[0]!.document).toHaveProperty('core_ui_form_components_toggle_base');
    expect(helpers[0]!.document).not.toHaveProperty('core_ui_form_components_slider_live');
  });

  it('preserves native slot transactions and guard visibility', () => {
    const source = compileScreen(container('entity'), { namespace: 'alpha', name: 'entity' });
    const pack = buildContainerPack([source], 'alpha');
    const support = pack.support.document;
    expect(support.core_ui_chest_slot_button).toMatchObject({ button_mappings: expect.arrayContaining([
      expect.objectContaining({ to_button_id: 'button.container_take_all_place_all' }),
      expect.objectContaining({ to_button_id: 'button.container_take_half_place_one' }),
      expect.objectContaining({ to_button_id: 'button.container_auto_place' }),
    ]) });
    expect(JSON.stringify(support.core_ui_chest_output_slot)).toContain(`(#identity = ${IDENTITY.guard})`);
    expect(pack.screens[0]!.allocation).toBe(source.allocation);
    expect(pack.screens[0]!.layoutId).toBe(source.layoutId);
    expect(pack.screens[0]!.looks).toBe(source.looks);
  });

  it.each(['entity', 'block'] as const)('stacks native slot contents, empty covers and the cursor on a %s host', (kind) => {
    for (const [parentLayer, slotLayer] of [[0, 0], [10, 20], [40, 500]]) {
      const source = compileScreen(() => Container({
        ...kind === 'entity' ? { entity: 'demo:crate' } : { block: 'demo:crate' },
        children: Panel({ zIndex: parentLayer, children: Panel({
          background: 'textures/ui/dialog_background_opaque',
          children: [Slot({ role: 'output', zIndex: slotLayer }), PlayerInventory({}), Hotbar({})],
        }) }),
      }), { namespace: 'alpha', name: kind });
      const pack = buildContainerPack([source], 'alpha');
      const support = pack.support.document;
      const layers = renderedLayers([
        pack.router, support, pack.screens[0]!.document,
        { namespace: source.facesNamespace, ...pack.screens[0]!.faces },
      ], String(pack.router.namespace) + '.alpha_gate_' + kind);
      const cover = layers.find(entry => entry.path.endsWith('/empty_guard/face'))!;
      const slotPath = cover.path.slice(0, -'/empty_guard/face'.length);
      const slotParts = layers.filter(entry => entry.path.startsWith(slotPath + '/item/')
        && /\/item_cell\/(?:item\/[^/]+|durability_bar)$/.test(entry.path));
      const nativeInputs = layers.filter(entry => entry.path.endsWith('/item_button_ref'));
      const cursorInputs = layers.filter(entry => /\/chrome\/(?:selected_icon|take_progress|gamepad_cursor)$/.test(entry.path));
      const cursor = layers.filter(entry => /\/selected_icon\/[^/]+\/selected_item_icon$/.test(entry.path));
      const stackCounts = layers.filter(entry => /\/selected_icon\/[^/]+\/selected_stack_size_text$/.test(entry.path));
      const pointer = layers.filter(entry => /\/gamepad_cursor\/[^/]+\/visual$/.test(entry.path));
      const heldDurability = layers.find(entry => entry.path.endsWith('/selected_icon/durability_bar_grabbed/visual'))!;

      expect(nativeInputs).toHaveLength(3);
      expect(cursorInputs).toHaveLength(3);
      expect(Math.max(...cursorInputs.map(entry => entry.layer))).toBeLessThan(Math.min(...nativeInputs.map(entry => entry.layer)));
      expect(slotParts).toHaveLength(3);
      expect(cursor).toHaveLength(3);
      expect(stackCounts).toHaveLength(3);
      expect(pointer).toHaveLength(3);
      expect(Math.max(...slotParts.map(entry => entry.layer))).toBeLessThan(cover.layer);
      expect(cover.layer).toBeLessThan(Math.min(...cursor.map(entry => entry.layer)));
      expect(cover.layer).toBeLessThan(Math.min(...stackCounts.map(entry => entry.layer)));
      expect(cover.layer).toBeLessThan(Math.min(...pointer.map(entry => entry.layer)));
      expect(cover.layer).toBeLessThan(heldDurability.layer);

      const guard = child(definition(support, 'core_ui_chest_output_slot'), 'empty_guard');
      expect(guard.button_mappings).toContainEqual(expect.objectContaining({ consume_event: true }));
      expect(JSON.stringify(guard.bindings)).toContain('(#identity = ' + IDENTITY.guard + ')');
      const gate = definition(pack.router, 'alpha_gate_' + kind);
      expect(JSON.stringify(gate.bindings)).toContain('(#layout = ' + source.layoutId + ')');
    }
  });

  it('keeps linked testing paths addressable without mutating compilation inputs', () => {
    const source = compileScreen(container('block'), { namespace: 'alpha', name: 'block', testMetadata: true });
    const before = JSON.stringify(source);
    const screen = buildContainerPack([source], 'alpha').screens[0]!;
    let locations = 0;
    for (const control of screen.testMetadata?.controls ?? []) {
      for (const location of control.paths) {
        let value: unknown = screen.document;
        for (const part of location) value = Reflect.get(value as object, part);
        expect(value).toBeTypeOf('object');
        locations += 1;
      }
    }
    expect(locations).toBeGreaterThan(2);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('keeps desktop and pocket fallbacks and exposes all addon insertions to either shell', () => {
    const alpha = build('alpha');
    const beta = build('beta');
    for (const ordered of [[alpha, beta], [beta, alpha]]) {
      expect(missingReferences(ordered.flatMap(documents))).toEqual([]);
      for (const pack of ordered) {
        const support = pack.documents.find(output => output.file.startsWith('ui/core-ui/support/'))!.document;
        const contents = JSON.stringify(support);
        for (const reference of [...vanilla].filter(name => !name.startsWith('common.'))) expect(contents).toContain(reference);
        for (const hook of pack.hooks.slice(0, 2)) {
          const screen = Object.entries(hook.document).find(([name]) => name.endsWith('@common.inventory_screen_common'))![1];
          expect(screen).toMatchObject({ variables: [
            expect.objectContaining({ requires: '$desktop_screen' }),
            expect.objectContaining({ requires: '$pocket_screen' }),
          ] });
        }
      }
    }
    expect(alpha.documents.map(output => output.file).some(file => beta.documents.some(other => other.file === file))).toBe(false);
  });

  it('handles empty and form-only builds without container helpers', () => {
    expect(buildUiPack([], 'alpha')).toEqual({ screens: [], hooks: [], documents: [] });
    const pack = buildUiPack([compileFormScreen(action, { namespace: 'alpha', name: 'home' })], 'alpha');
    expect(JSON.stringify(documents(pack))).not.toContain('core_ui_chest');
    expect(pack.hooks.map(hook => hook.file)).toEqual(['ui/server_form.json']);
  });

  it('rejects mixed ownership and duplicate container routes', () => {
    const screen = compileScreen(container('entity'), { namespace: 'alpha', name: 'entity' });
    expect(() => buildUiPack([screen], 'beta')).toThrow('one addon namespace');
    expect(() => buildContainerPack([screen], 'beta')).toThrow('one addon namespace');
    expect(() => buildContainerPack([screen, screen], 'alpha')).toThrow('share layout key');
    expect(() => buildUiPack([], '../alpha')).toThrow('Invalid UI addon namespace');
  });
});
