import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { layoutKey, PROTOCOL_ITEM_AUX } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { demoCounts, demoEntity, demoScreen } from '../__fixtures__/demo';
import { buildRouter, type CompiledScreen } from '../compile';
import { CHEST_HOST } from '../hosts/chest';
import { faceOf } from '../face';
import { fill } from '../fill';
import { CHEST_EMIT } from '../hosts/chest';
import {
  child, definition, defs, entries, modification,
} from '../__fixtures__/helpers';
import type { Document } from '../jsonui';

/** The static files the render pack ships for container screens. */
const CHEST_DIR = path.resolve(__dirname, '../../../resource-pack/packs/RP/ui/core-ui/hosts/chest');

/** The chest root every addon's router adds to, in its own namespace. */
const ROUTER_FILE = 'router.json';

/** JSON UI files carry `//` comments; strip them before parsing. */
const readJsonc = (file: string): Document => JSON.parse(
  readFileSync(file, 'utf-8').replaceAll(/^\s*\/\/.*$/gm, ''),
) as Document;

const staticFiles = (): string[] => readdirSync(CHEST_DIR).filter(name => name.endsWith('.json'));

/** The `core_ui_chest` definitions, by name. */
const staticDefinitions = (): Set<string> => {
  const names = new Set<string>();

  for (const file of staticFiles().filter(name => name !== ROUTER_FILE)) {
    const document = readJsonc(path.join(CHEST_DIR, file));

    expect(document.namespace).toBe('core_ui_chest');

    for (const key of Object.keys(document)) {
      // A derived definition is addressed by the name before its `@`.
      names.add(key.split('@')[0] ?? key);
    }
  }

  return names;
};

/**
 * The reference screen's JSON UI, as the router would reach it. The filter
 * writes the real files; this checks the things the router depends on and
 * would fail silently on: the namespace, the definition names, and that every
 * definition the screen references exists — in itself or in the static files.
 */
describe('the reference screen', () => {
  const face = faceOf(demoScreen);
  const document = fill(face, CHEST_EMIT);
  const compiled: CompiledScreen = {
    name: 'demo',
    addon: 'core_ui',
    namespace: demoScreen.namespace,
    layoutId: layoutKey('core_ui', 'demo'),
    entity: demoEntity,
    document,
    face,
    facesNamespace: face.facesNamespace,
    faces: face.faces,
    allocation: demoCounts,
    hasBackdrop: true,
    hasText: true,
  };

  it('is addressable by the chest router', () => {
    // If either half moves, the container renders empty with nothing in the
    // log to explain why.
    const { router } = buildRouter([compiled]);
    const gate = definition(router, 'core_ui_low_gate_demo');

    for (const entry of gate.controls ?? []) {
      for (const name of Object.keys(entry)) {
        const [, reference] = name.split('@');
        const [namespace, target] = (reference ?? '').split('.');

        expect(namespace).toBe(document.namespace);
        expect(definition(document, target ?? '')).toBeDefined();
      }
    }

    expect(child(definition(router, 'core_ui_root'), 'demo@core_ui_router.core_ui_host_demo')).toEqual({});
  });

  it('references only the library\'s own definitions, every one of which exists', () => {
    const available = staticDefinitions();
    const referenced = JSON.stringify(document).match(/core_ui_chest\.[a-z_]+/g) ?? [];

    expect(referenced.length).toBeGreaterThan(0);

    for (const reference of referenced) {
      expect(available.has(reference.slice('core_ui_chest.'.length)), reference).toBe(true);
    }

    // Nothing of vanilla's: the cells, the buttons, the scroll and the
    // transport-hiding renderer are all the library's.
    expect(JSON.stringify(document)).not.toMatch(/@(common|chest|pocket_containers)\./);
    expect(JSON.stringify(document)).not.toMatch(/"(common|chest)\.[a-z_]+"/);
    expect(JSON.stringify(document)).not.toMatch(/(?<!\w)@(common|chest|pocket_containers)\./);
  });

  it('ships static definitions that reference nothing of vanilla\'s', () => {
    for (const file of staticFiles().filter(name => name !== ROUTER_FILE)) {
      const text = JSON.stringify(readJsonc(path.join(CHEST_DIR, file)));

      // `(?<!\w)` so the library's own `core_ui_chest.` is not read as
      // vanilla's `chest.`: a namespace reference starts at `@`, a quote or a
      // separator, never in the middle of a longer name.
      expect(text, file).not.toMatch(/(?<!\w)@?(common|chest|pocket_containers)\.[a-z_]+/);
    }
  });

  it('round-trips through JSON unchanged', () => {
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('never mints a bcui name', () => {
    expect(JSON.stringify(document)).not.toContain('bcui');
  });
});

/**
 * The chest root is static, so its literals cannot come from the runtime at
 * build time; this pins them to the constants, and checks the render pack's
 * copy of vanilla's chest file keeps to what the engine stacks: the screen's
 * content switched the way vanilla's own derived screens switch theirs, a
 * gate on two chest-only definitions, and nothing removed, re-emitted, or
 * inserted into an inherited array.
 */
describe('the chest hook', () => {
  const UI_DIR = path.resolve(CHEST_DIR, '../../..');
  const root = readJsonc(path.join(CHEST_DIR, ROUTER_FILE));
  const hook = readJsonc(path.join(UI_DIR, 'chest_screen.json'));
  const { router, hooks } = buildRouter([]);
  const inverted = {
    binding_type: 'view',
    source_property_name: `(not (#core_ui_aux = ${PROTOCOL_ITEM_AUX}))`,
    target_property_name: '#visible',
  };

  it("holds vanilla's two chest panels by reference behind the inverted gate, and the chrome and the roots behind the claimed one", () => {
    expect(root.namespace).toBe('core_ui_router');
    expect(router.namespace).toBe(root.namespace);
    expect(definition(root, 'vanilla_gate').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `(not (#aux = ${PROTOCOL_ITEM_AUX}))`,
      target_property_name: '#visible',
    });
    expect(definition(root, 'claimed_gate').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `(#aux = ${PROTOCOL_ITEM_AUX})`,
      target_property_name: '#visible',
    });
    expect(entries(definition(root, 'vanilla_gate_desktop@core_ui_router.vanilla_gate'))).toEqual([['vanilla@chest.small_chest_panel', {}]]);
    expect(entries(definition(root, 'vanilla_gate_pocket@core_ui_router.vanilla_gate'))).toEqual([['vanilla@pocket_containers.small_chest_panel', {}]]);
    expect(entries(definition(root, 'claimed_gate')).map(([name]) => name)).toEqual([
      'chrome@core_ui_chest.chrome',
      `roots@chest.${CHEST_HOST.hooks[0]?.target ?? ''}`,
    ]);

    // Referenced, never re-emitted: those three names are the only vanilla ones in the file.
    const vanilla = JSON.stringify(root).match(/"[^"]*@(common|chest|pocket_containers)\.[^"]*"/g) ?? [];

    expect(vanilla).toEqual([
      '"vanilla@chest.small_chest_panel"',
      '"vanilla@pocket_containers.small_chest_panel"',
      '"roots@chest.small_chest_panel_top_half"',
    ]);

    expect(entries(definition(root, 'chest_root')).map(([child]) => child)).toEqual([
      'vanilla@core_ui_router.vanilla_host_desktop',
      'claimed@core_ui_router.claimed_host',
    ]);
    expect(entries(definition(root, 'chest_root_pocket')).map(([child]) => child)).toEqual([
      'vanilla@core_ui_router.vanilla_host_pocket',
      'claimed@core_ui_router.claimed_host',
    ]);

    // No $variable anywhere in the root: not in a name, not in an expression.
    expect(JSON.stringify(root)).not.toContain('$');
  });

  it("points the screen's content at the roots from the screen definition, and gates the top half's label and grid", () => {
    expect(Object.keys(defs(hook))).toEqual(['small_chest_screen@common.inventory_screen_common']);
    expect(definition(hook, 'small_chest_screen@common.inventory_screen_common').variables).toEqual([
      {
        requires: '$desktop_screen',
        $screen_content: 'core_ui_router.chest_root',
        $screen_bg_content: 'common.screen_background',
        $screen_background_alpha: 0.4,
      },
      {
        requires: '$pocket_screen',
        $use_custom_pocket_toast: true,
        $screen_content: 'core_ui_router.chest_root_pocket',
      },
    ]);

    for (const name of ['chest_label', 'small_chest_grid']) {
      const [only, ...rest] = modification(hook, name).modifications;

      expect(rest).toEqual([]);
      expect(only?.array_name).toBe('bindings');
      expect(only?.operation).toBe('insert_back');
      expect(only?.value).toContainEqual(inverted);
    }

    // Nothing removed, and no array inserted into that the target does not declare.
    expect(JSON.stringify(hook)).not.toContain('"remove"');
    expect(JSON.stringify(hook)).not.toContain('"array_name":"controls"');
  });

  it('is the top half the addon hooks insert their roots into', () => {
    const [addonHook] = hooks;

    expect(addonHook?.file).toBe('ui/chest_screen.json');
    expect(Object.keys(addonHook?.document ?? {})).toEqual(['namespace', 'small_chest_panel_top_half']);
  });

});
