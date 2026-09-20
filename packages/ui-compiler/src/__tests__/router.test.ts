import {
  COLLECTION, ContainerScreenError, IDENTITY, MAX_LAYOUT,
} from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { buildRouter, type CompiledScreen } from '../compile';
import { faceOf } from '../face';
import { CHEST_HOST, MOUNT_ANCHOR, routerFileOf } from '../hosts/chest';
import {
  child, definition, defs, eachControl, entries, isModified, modification,
} from '../__fixtures__/helpers';

const screen = (
  name: string,
  layoutId: number,
  hasBackdrop = false,
  addon = 'core',
  kind: 'entity' | 'block' = 'entity',
): CompiledScreen => ({
  name,
  addon,
  namespace: `${addon}_${name}`,
  layoutId,
  host: { kind, type: `${addon}:${name}` },
  face: faceOf({
    namespace: `${addon}_${name}`,
    collection: 'container_items',
    root: { kind: 'panel', name: 'root', rect: { x: 0, y: 0, width: 320, height: 210 }, children: [] },
  }),
  facesNamespace: `${addon}_faces`,
  faces: {},
  document: { namespace: `${addon}_${name}` },
  allocation: { sentinels: 1, drawn: 0, channels: 0, size: 1 },
  hasBackdrop,
  hasText: false,
  lang: {},
  looks: [],
});

describe('the chest routing', () => {
  const { hooks, router, routerFile } = buildRouter([screen('furnace', 3, true), screen('crate', 7)]);

  it('names the hosts: the two vanilla container screens for the hooks, the addon\'s own file for the router', () => {
    expect(CHEST_HOST).toMatchObject({
      id: 'chest',
      hooks: [
        { file: 'ui/chest_screen.json', namespace: 'chest', target: 'small_chest_panel_top_half' },
        { file: 'ui/data_driven_container_screen.json', namespace: 'data_driven_container', target: 'panel_top_half' },
      ],
      routerDir: 'ui/core-ui/screens',
      routerNamespace: 'core_ui_router',
      collection: COLLECTION,
      containerType: 'container',
      canvas: { width: 320, height: 210 },
    });
    expect(router.namespace).toBe('core_ui_router');
    expect(routerFile).toBe('ui/core-ui/screens/core_router.json');
    expect(routerFileOf('drav0011_shop')).toBe('ui/core-ui/screens/drav0011_shop_router.json');
  });

  it('hooks both top halves, definitions that declare their own controls, with one modification each and defines nothing', () => {
    // A definition in a vanilla file would replace vanilla's and every other
    // pack's; a modification stacks with them in any pack order. And the
    // array has to be the target's own: an insert on a definition that only
    // inherits it creates one that shadows the inherited one.
    //
    // One root, both screens: a block's container opens the data-driven
    // container screen and an entity's opens the chest, and the routing that
    // picks a layout is the same on either.
    expect(hooks.map(hook => hook.file)).toEqual([
      'ui/chest_screen.json',
      'ui/data_driven_container_screen.json',
    ]);

    for (const [index, hook] of hooks.entries()) {
      const { namespace, target } = CHEST_HOST.hooks[index] ?? { namespace: '', target: '' };

      expect(hook.document.namespace).toBe(namespace);
      expect(Object.keys(defs(hook.document))).toEqual([]);
      expect(modification(hook.document, target)).toEqual({
        modifications: [
          {
            array_name: 'controls',
            operation: 'insert_back',
            value: [{ 'core@core_ui_router.core_root': {} }],
          },
        ],
      });
    }
  });

  it('gates each screen once, on the sentinel\'s identity and its layout key, both durability', () => {
    const gate = definition(router, 'core_gate_furnace');

    expect(gate).toMatchObject({ type: 'panel', size: ['100%', '100%'], layer: 5 });
    expect(gate.bindings).toContainEqual({
      binding_name: '#item_durability_total_amount',
      binding_name_override: '#identity',
      binding_type: 'collection',
      binding_collection_name: COLLECTION,
    });
    expect(gate.bindings).toContainEqual({
      binding_name: '#item_durability_current_amount',
      binding_name_override: '#layout',
      binding_type: 'collection',
      binding_collection_name: COLLECTION,
    });
    expect(gate.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `((#identity = ${IDENTITY.sentinel}) and (#layout = 3))`,
      target_property_name: '#visible',
    });
    expect(definition(router, 'core_gate_crate').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `((#identity = ${IDENTITY.sentinel}) and (#layout = 7))`,
      target_property_name: '#visible',
    });
  });

  it('hosts the gate on the sentinel slot', () => {
    expect(definition(router, 'core_host_furnace')).toEqual({
      type: 'stack_panel',
      orientation: 'vertical',
      size: ['100%', '100%'],
      collection_name: COLLECTION,
      controls: [{ 'gate@core_ui_router.core_gate_furnace': { collection_index: 0 } }],
    });
  });

  it('mounts the screen centred on the chest screen, behind it the backdrop', () => {
    const furnace = definition(router, 'core_gate_furnace');

    expect(entries(furnace).map(([name]) => name)).toEqual([
      'backdrop@core_furnace.backdrop',
      'screen@core_furnace.screen',
    ]);
    expect(child(furnace, 'screen@core_furnace.screen')).toEqual({
      anchor_from: 'center',
      anchor_to: 'center',
    });
    expect(MOUNT_ANCHOR).toBe('center');
    expect(entries(definition(router, 'core_gate_crate')).map(([name]) => name)).toEqual(['screen@core_crate.screen']);
  });

  it('gathers every screen under the addon\'s root, which the hooks insert', () => {
    expect(entries(definition(router, 'core_root')).map(([name]) => name)).toEqual([
      'furnace@core_ui_router.core_host_furnace',
      'crate@core_ui_router.core_host_crate',
    ]);
    expect(Object.keys(defs(router))).toEqual([
      'core_gate_furnace', 'core_host_furnace', 'core_gate_crate', 'core_host_crate', 'core_root',
    ]);
    // The router defines; it never modifies — a modification outside the
    // vanilla file it targets is read as a definition of its own.
    expect(Object.values(router).some(value => typeof value !== 'string' && isModified(value))).toBe(false);
  });

  it('carries the addon\'s name on every definition, so two routers never collide', () => {
    const shop = buildRouter([screen('till', 5, false, 'drav0011_shop')]);

    expect(Object.keys(defs(shop.router))).toEqual([
      'drav0011_shop_gate_till', 'drav0011_shop_host_till', 'drav0011_shop_root',
    ]);
    expect(modification(shop.hooks[0]?.document ?? { namespace: '' }, 'small_chest_panel_top_half').modifications[0]?.value).toEqual([
      { 'drav0011_shop@core_ui_router.drav0011_shop_root': {} },
    ]);
    expect(modification(shop.hooks[1]?.document ?? { namespace: '' }, 'panel_top_half').modifications[0]?.value).toEqual([
      { 'drav0011_shop@core_ui_router.drav0011_shop_root': {} },
    ]);
    expect(Object.keys(defs(shop.router)).some(name => name in defs(router))).toBe(false);
  });

  it('routes a block-hosted screen through the same gates as an entity-hosted one', () => {
    const blocks = buildRouter([screen('workbench', 11, false, 'core', 'block')]);

    expect(Object.keys(defs(blocks.router))).toEqual([
      'core_gate_workbench', 'core_host_workbench', 'core_root',
    ]);
    expect(blocks.hooks.map(hook => hook.file)).toEqual([
      'ui/chest_screen.json',
      'ui/data_driven_container_screen.json',
    ]);
  });

  it('references nothing of vanilla\'s: the chest panels are the chest root\'s business', () => {
    expect(JSON.stringify(router)).not.toMatch(/@?(common|chest|pocket_containers)\.[a-z_]+/);
    expect(JSON.stringify(router)).not.toContain('bcui');
  });

  it('keeps every binding expression literal', () => {
    eachControl(router, (name, control) => {
      for (const binding of control.bindings ?? []) {
        expect(binding.source_property_name ?? '', `${name} source_property_name`).not.toMatch(/\$/);
      }
    });
  });

  it('routes an addon with no screens to an empty root', () => {
    const empty = buildRouter([]);

    expect(Object.keys(defs(empty.router))).toEqual(['core_ui_root']);
    expect(entries(definition(empty.router, 'core_ui_root'))).toHaveLength(0);
  });

  describe('refusals', () => {
    it('rejects a layout id past what the sentinel\'s durability can carry', () => {
      expect(() => buildRouter([screen('far', MAX_LAYOUT + 1)])).toThrow(ContainerScreenError);
      expect(() => buildRouter([screen('far', MAX_LAYOUT + 1)])).toThrow(/current durability/);
      expect(() => buildRouter([screen('edge', MAX_LAYOUT)])).not.toThrow();
    });

    it('rejects a layout id below one', () => {
      expect(() => buildRouter([screen('zero', 0)])).toThrow(ContainerScreenError);
    });

    it('rejects two screens sharing a key or a name', () => {
      expect(() => buildRouter([screen('a', 1), screen('b', 1)])).toThrow(/share layout key 1/);
      expect(() => buildRouter([screen('a', 1), screen('a', 2)])).toThrow(/named "a"/);
    });

    it('rejects screens of different addons in one router', () => {
      expect(() => buildRouter([screen('a', 1), screen('b', 2, false, 'other')])).toThrow(/different addons/);
    });
  });
});
