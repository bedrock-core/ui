import { IDENTITY, layoutKey } from '@bedrock-core/ui-runtime/compile';
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
import { buildContainerPack } from '../hosts/chest/pack';
import chestCell from '../support/templates/chest_cell';
import chestChrome from '../support/templates/chest_chrome';
import chestText from '../support/templates/chest_text';

/** Container primitives evaluated with their symbolic dependency names. */
const templates = { ...chestCell, ...chestChrome, ...chestText };
const primitiveDocuments = (): Document[] => Object.entries(templates).map(([name, factory]) => {
  const built = factory({ ref: reference => reference });
  const key = name.slice('core_ui_chest.'.length);
  return { namespace: 'core_ui_chest', [built.base === undefined ? key : `${key}@${built.base}`]: built.control } as Document;
});
const staticDefinitions = (): Set<string> => new Set(Object.keys(templates).map(name => name.slice('core_ui_chest.'.length)));

/**
 * The reference screen's JSON UI, as the router would reach it. The filter
 * writes the real files; this checks the things the router depends on and
 * would fail silently on: the namespace, the definition names, and that every
 * definition the screen references exists — in itself or in the compiler templates.
 */
describe('the reference screen', () => {
  const face = faceOf(demoScreen);
  const document = fill(face, CHEST_EMIT);
  const compiled: CompiledScreen = {
    name: 'demo',
    addon: 'core_ui',
    namespace: demoScreen.namespace,
    layoutId: layoutKey('core_ui', 'demo'),
    host: { kind: 'entity', type: demoEntity },
    document,
    face,
    facesNamespace: face.facesNamespace,
    faces: face.faces,
    allocation: demoCounts,
    hasBackdrop: true,

    lang: {},
    looks: [],
    texts: [],
  };

  it('is addressable by the chest router', () => {
    // If either half moves, the container renders empty with nothing in the
    // log to explain why.
    const { router } = buildRouter([compiled]);
    const gate = definition(router, 'core_ui_gate_demo');

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

  it('keeps its primitive templates independent of vanilla definitions', () => {
    for (const primitive of primitiveDocuments()) {
      const text = JSON.stringify(primitive);

      // `(?<!\w)` so the library's own `core_ui_chest.` is not read as
      // vanilla's `chest.`: a namespace reference starts at `@`, a quote or a
      // separator, never in the middle of a longer name.
      expect(text).not.toMatch(/(?<!\w)@?(common|chest|pocket_containers)\.[a-z_]+/);
    }
  });

  it('round-trips through JSON unchanged', () => {
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('never mints a bcui name', () => {
    expect(JSON.stringify(document)).not.toContain('bcui');
  });
});

/** The generated hooks preserve native content and slot visibility for both container hosts. */
describe('compiled container hooks', () => {
  const pack = buildContainerPack([], 'addon');
  const root = pack.support.document;
  const support = (name: string): string => `addon__ui_support.core_ui_router_${name}`;
  const get = (name: string): ReturnType<typeof definition> => definition(root, `core_ui_router_${name}`);

  it('gates vanilla and claimed content on the same runtime identity', () => {
    expect(get('vanilla_gate').bindings).toContainEqual({
      binding_type: 'view', source_property_name: `(not (#identity = ${IDENTITY.sentinel}))`, target_property_name: '#visible',
    });
    expect(get('claimed_gate').bindings).toContainEqual({
      binding_type: 'view', source_property_name: `(#identity = ${IDENTITY.sentinel})`, target_property_name: '#visible',
    });
  });

  for (const [index, prefix, screen, label, grid, identity] of [
    [0, 'chest', 'small_chest_screen', 'chest_label', 'small_chest_grid', '#core_ui_identity'],
    [1, 'block', 'screen', 'container_label', 'item_grid', '#core_ui_ddc_identity'],
  ] as const) {
    it(`mounts the ${prefix} shell in desktop and pocket profiles without replacing native arrays`, () => {
      const hook = pack.hooks[index]!;
      const host = CHEST_HOST.hooks[index]!;
      expect(hook.file).toBe(host.file);
      expect(definition(hook.document, `${screen}@common.inventory_screen_common`).variables).toEqual([
        {
          requires: '$desktop_screen', $screen_content: support(`${prefix}_root`),
          $screen_bg_content: 'common.screen_background', $screen_background_alpha: 0.4,
        },
        { requires: '$pocket_screen', $use_custom_pocket_toast: true, $screen_content: support(`${prefix}_root_pocket`) },
      ]);
      for (const name of [label, grid]) {
        const changes = modification(hook.document, name).modifications;
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({ array_name: 'bindings', operation: 'insert_back', value: expect.arrayContaining([
          { binding_type: 'view', source_property_name: `(not (${identity} = ${IDENTITY.sentinel}))`, target_property_name: '#visible' },
        ]) });
      }
      expect(modification(hook.document, host.target).modifications).toEqual([
        { array_name: 'controls', operation: 'insert_back', value: [{ 'addon@addon__containers.addon_root': {} }] },
      ]);
      expect(Object.keys(defs(hook.document))).toEqual([`${screen}@common.inventory_screen_common`]);
      expect(JSON.stringify(hook.document)).not.toContain('"remove"');
    });
  }

  it('holds desktop and pocket vanilla panels by reference', () => {
    expect(entries(get(`vanilla_gate_desktop@${support('vanilla_gate')}`))).toEqual([['vanilla@chest.small_chest_panel', {}]]);
    expect(entries(get(`vanilla_gate_pocket@${support('vanilla_gate')}`))).toEqual([['vanilla@pocket_containers.small_chest_panel', {}]]);
    expect(entries(get(`block_vanilla_gate_desktop@${support('vanilla_gate')}`))).toEqual([['vanilla@data_driven_container.desktop_panel', {}]]);
    expect(entries(get(`block_vanilla_gate_pocket@${support('vanilla_gate')}`))).toEqual([['vanilla@pocket_containers.data_driven_container_panel', {}]]);
    expect(entries(get('claimed_gate')).map(([name]) => name)).toEqual([
      'chrome@addon__ui_support.core_ui_chest_chrome', `roots@chest.${CHEST_HOST.hooks[0]!.target}`,
    ]);
    expect(entries(get(`block_claimed_gate@${support('claimed_gate')}`)).map(([name]) => name)).toEqual([
      'chrome@addon__ui_support.core_ui_chest_chrome', `roots@data_driven_container.${CHEST_HOST.hooks[1]!.target}`,
    ]);
  });
});
