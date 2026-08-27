import {
  COLLECTION, ContainerScreenError, MAX_LAYOUT, PROTOCOL_ITEM_AUX, splitKey,
} from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { buildRouter, type CompiledScreen } from '../compile';
import { CHEST_HOST, MOUNT_ANCHOR, routerFileOf } from '../hosts/chest';
import {
  child, definition, defs, eachControl, entries, isModified, modification,
} from '../__fixtures__/helpers';

const screen = (name: string, layoutId: number, hasBackdrop = false, addon = 'core'): CompiledScreen => ({
  name,
  addon,
  namespace: `${addon}_${name}`,
  layoutId,
  entity: `${addon}:${name}`,
  document: { namespace: `${addon}_${name}` },
  allocation: { sentinels: 2, drawn: 0, channels: 0, size: 2 },
  hasBackdrop,
  hasText: false,
});

describe('the chest routing', () => {
  const { hooks, router, routerFile } = buildRouter([screen('furnace', 3, true), screen('crate', 7)]);

  it('names the host: vanilla\'s chest screen for the hook, the addon\'s own file for the router', () => {
    expect(CHEST_HOST).toMatchObject({
      id: 'chest',
      hooks: [
        { file: 'ui/chest_screen.json', namespace: 'chest', target: 'small_chest_panel_top_half' },
      ],
      routerDir: 'ui/core-ui/screens',
      routerNamespace: 'core_ui_router',
      collection: COLLECTION,
      containerType: 'container',
      canvas: { width: 320, height: 210 },
      ownedItemRenderer: 'core_ui_container.gated_item',
    });
    expect(router.namespace).toBe('core_ui_router');
    expect(routerFile).toBe('ui/core-ui/screens/core_router.json');
    expect(routerFileOf('drav0011_shop')).toBe('ui/core-ui/screens/drav0011_shop_router.json');
  });

  it('hooks the chest top half, a definition that declares its own controls, with one modification and defines nothing', () => {
    // A definition in a vanilla file would replace vanilla's and every other
    // pack's; a modification stacks with them in any pack order. And the
    // array has to be the target's own: an insert on a definition that only
    // inherits it creates one that shadows the inherited one.
    expect(hooks.map(hook => hook.file)).toEqual(['ui/chest_screen.json']);

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

  it('gates each screen twice, once per sentinel slot, on the protocol id and a stack size', () => {
    const { high, low } = splitKey(3);
    const outer = definition(router, 'core_gate_furnace');
    const inner = definition(router, 'core_low_gate_furnace');

    for (const gate of [outer, inner]) {
      expect(gate).toMatchObject({ type: 'panel', size: ['100%', '100%'] });
      expect(gate.bindings).toContainEqual({
        binding_name: '#item_id_aux',
        binding_name_override: '#aux',
        binding_type: 'collection',
        binding_collection_name: COLLECTION,
      });
      expect(gate.bindings).toContainEqual({
        binding_name: '#inventory_stack_count',
        binding_name_override: '#count',
        binding_type: 'collection',
        binding_collection_name: COLLECTION,
      });
    }

    expect(outer.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `((#aux = ${PROTOCOL_ITEM_AUX}) and (#count = '${high}'))`,
      target_property_name: '#visible',
    });
    expect(inner).toMatchObject({ layer: 5 });
    expect(inner.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `((#aux = ${PROTOCOL_ITEM_AUX}) and (#count = '${low}'))`,
      target_property_name: '#visible',
    });
    expect(entries(outer).map(([name]) => name)).toEqual(['low@core_ui_router.core_low_host_furnace']);

    const crate = splitKey(7);

    expect(definition(router, 'core_low_gate_crate').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `((#aux = ${PROTOCOL_ITEM_AUX}) and (#count = '${crate.low}'))`,
      target_property_name: '#visible',
    });
  });

  it('hosts the outer gate on the first sentinel slot and the inner on the second', () => {
    expect(definition(router, 'core_host_furnace')).toEqual({
      type: 'stack_panel',
      orientation: 'vertical',
      size: ['100%', '100%'],
      collection_name: COLLECTION,
      controls: [{ 'gate@core_ui_router.core_gate_furnace': { collection_index: 0 } }],
    });
    expect(definition(router, 'core_low_host_furnace')).toEqual({
      type: 'stack_panel',
      orientation: 'vertical',
      size: ['100%', '100%'],
      collection_name: COLLECTION,
      controls: [{ 'gate@core_ui_router.core_low_gate_furnace': { collection_index: 1 } }],
    });
  });

  it('mounts the screen centred on the chest screen, behind it the backdrop', () => {
    const furnace = definition(router, 'core_low_gate_furnace');

    expect(entries(furnace).map(([name]) => name)).toEqual([
      'backdrop@core_furnace.backdrop',
      'screen@core_furnace.screen',
    ]);
    expect(child(furnace, 'screen@core_furnace.screen')).toEqual({
      anchor_from: 'center',
      anchor_to: 'center',
    });
    expect(MOUNT_ANCHOR).toBe('center');
    expect(entries(definition(router, 'core_low_gate_crate')).map(([name]) => name)).toEqual(['screen@core_crate.screen']);
  });

  it('gathers every screen under the addon\'s root, which the hooks insert', () => {
    expect(entries(definition(router, 'core_root')).map(([name]) => name)).toEqual([
      'furnace@core_ui_router.core_host_furnace',
      'crate@core_ui_router.core_host_crate',
    ]);
    expect(Object.keys(defs(router))).toEqual([
      'core_low_gate_furnace', 'core_low_host_furnace', 'core_gate_furnace', 'core_host_furnace',
      'core_low_gate_crate', 'core_low_host_crate', 'core_gate_crate', 'core_host_crate',
      'core_root',
    ]);
    // The router defines; it never modifies — a modification outside the
    // vanilla file it targets is read as a definition of its own.
    expect(Object.values(router).some(value => typeof value !== 'string' && isModified(value))).toBe(false);
  });

  it('carries the addon\'s name on every definition, so two routers never collide', () => {
    const shop = buildRouter([screen('till', 5, false, 'drav0011_shop')]);

    expect(Object.keys(defs(shop.router))).toEqual([
      'drav0011_shop_low_gate_till', 'drav0011_shop_low_host_till',
      'drav0011_shop_gate_till', 'drav0011_shop_host_till', 'drav0011_shop_root',
    ]);
    expect(modification(shop.hooks[0]?.document ?? { namespace: '' }, 'small_chest_panel_top_half').modifications[0]?.value).toEqual([
      { 'drav0011_shop@core_ui_router.drav0011_shop_root': {} },
    ]);
    expect(Object.keys(defs(shop.router)).some(name => name in defs(router))).toBe(false);
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
    it('rejects a layout id past what two stacks can spell', () => {
      expect(() => buildRouter([screen('far', MAX_LAYOUT + 1)])).toThrow(ContainerScreenError);
      expect(() => buildRouter([screen('far', MAX_LAYOUT + 1)])).toThrow(/two stack sizes/);
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
