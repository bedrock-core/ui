import {
  COLLECTION, ContainerScreenError, MAX_LAYOUT, PROTOCOL_ITEM_AUX, TRANSPORT_ORDINAL,
} from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { buildRouter, type CompiledScreen } from '../compile';
import { CHEST_HOST, MOUNT_ANCHOR } from '../hosts/chest';
import { child, definition, defs, eachControl, entries } from '../__fixtures__/helpers';

const screen = (name: string, layoutId: number, hasBackdrop = false): CompiledScreen => ({
  name,
  namespace: `core_ui_${name}`,
  layoutId,
  entity: `core:${name}`,
  document: { namespace: `core_ui_${name}` },
  allocation: { sentinel: 0, drawn: 0, channels: 0, size: 1 },
  hasBackdrop,
  hasText: false,
});

describe('the chest router', () => {
  const router = buildRouter([screen('furnace', 3, true), screen('crate', 7)]);

  it('lives in vanilla\'s namespace and file', () => {
    expect(router.namespace).toBe('chest');
    expect(CHEST_HOST).toMatchObject({
      id: 'chest',
      file: 'ui/chest_screen.json',
      collection: COLLECTION,
      containerType: 'container',
      canvas: { width: 320, height: 210 },
    });
  });

  it('mints only core_ui names beside the vanilla replacement', () => {
    for (const name of Object.keys(defs(router))) {
      if (name !== 'small_chest_panel') {
        expect(name.startsWith('core_ui_'), name).toBe(true);
      }
    }

    expect(JSON.stringify(router)).not.toContain('bcui');
  });

  it('gates each screen on the sentinel\'s two keys, as literals', () => {
    const gate = definition(router, 'core_ui_gate_furnace');

    expect(gate).toMatchObject({ type: 'panel', size: ['100%', '100%'], layer: 5 });
    expect(gate.bindings).toContainEqual({
      binding_name: '#item_id_aux',
      binding_name_override: '#aux',
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
      source_property_name: `((#aux = ${PROTOCOL_ITEM_AUX}) and (#layout = 3))`,
      target_property_name: '#visible',
    });
    expect(definition(router, 'core_ui_gate_crate').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `((#aux = ${PROTOCOL_ITEM_AUX}) and (#layout = 7))`,
      target_property_name: '#visible',
    });
  });

  it('hosts each gate on a collection host reading the sentinel', () => {
    const host = definition(router, 'core_ui_host_furnace');

    expect(host).toEqual({
      type: 'stack_panel',
      orientation: 'vertical',
      size: ['100%', '100%'],
      collection_name: COLLECTION,
      controls: [{ 'gate@chest.core_ui_gate_furnace': { collection_index: 0 } }],
    });
  });

  it('mounts the screen centred on the chest screen, behind it the backdrop', () => {
    const furnace = definition(router, 'core_ui_gate_furnace');

    expect(entries(furnace).map(([name]) => name)).toEqual([
      'backdrop@core_ui_furnace.backdrop',
      'screen@core_ui_furnace.screen',
    ]);
    expect(child(furnace, 'screen@core_ui_furnace.screen')).toEqual({
      anchor_from: 'center',
      anchor_to: 'center',
    });
    expect(MOUNT_ANCHOR).toBe('center');

    const crate = definition(router, 'core_ui_gate_crate');

    expect(entries(crate).map(([name]) => name)).toEqual(['screen@core_ui_crate.screen']);
  });

  it('defines the two grids a compiled screen references', () => {
    expect(definition(router, 'core_ui_inventory_grid')).toEqual({
      type: 'grid',
      size: [162, 54],
      grid_dimensions: [9, 3],
      grid_item_template: 'chest.core_ui_inventory_item',
      collection_name: 'inventory_items',
    });
    expect(definition(router, 'core_ui_hotbar_grid')).toEqual({
      type: 'grid',
      size: [162, 18],
      grid_dimensions: [9, 1],
      grid_item_template: 'chest.core_ui_hotbar_item',
      collection_name: 'hotbar_items',
    });
    expect(CHEST_HOST.grids).toEqual({ inventory: 'core_ui_inventory_grid', hotbar: 'core_ui_hotbar_grid' });
  });

  it('hides a transport item in the redrawn grids', () => {
    const gated = definition(router, 'core_ui_gated_item');

    expect(gated.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `(not ((#aux = ${PROTOCOL_ITEM_AUX}) and (#dur = ${TRANSPORT_ORDINAL})))`,
      target_property_name: '#visible',
    });

    for (const cell of ['core_ui_inventory_item@common.container_item', 'core_ui_hotbar_item@common.container_item']) {
      expect(definition(router, cell)).toMatchObject({
        $item_renderer: 'chest.core_ui_gated_item',
        $durability_bar_required: false,
      });
    }
  });

  it('inverts the gate for an ordinary chest', () => {
    const vanilla = definition(router, 'core_ui_vanilla_gate');

    expect(vanilla.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: `(not (#aux = ${PROTOCOL_ITEM_AUX}))`,
      target_property_name: '#visible',
    });
    expect(entries(vanilla).map(([name]) => name)).toEqual([
      'common_panel@common.common_panel',
      'small_chest_panel_top_half@chest.small_chest_panel_top_half',
      'inventory_panel_bottom_half_with_label@common.inventory_panel_bottom_half_with_label',
      'hotbar_grid@common.hotbar_grid_template',
      'flying_item_renderer@common.flying_item_renderer',
    ]);
    expect(definition(router, 'core_ui_vanilla_host').controls).toEqual([
      { 'gate@chest.core_ui_vanilla_gate': { collection_index: 0 } },
    ]);
  });

  it('replaces the whole chest panel, keeping the functional chrome for every path', () => {
    const panel = definition(router, 'small_chest_panel');

    expect(entries(panel).map(([name]) => name)).toEqual([
      'container_gamepad_helpers@common.container_gamepad_helpers',
      'selected_item_details_factory@common.selected_item_details_factory',
      'item_lock_notification_factory@common.item_lock_notification_factory',
      'root_panel@common.root_panel',
      'core_ui_furnace@chest.core_ui_host_furnace',
      'core_ui_crate@chest.core_ui_host_crate',
    ]);

    const root = child(panel, 'root_panel@common.root_panel');

    expect(root.layer).toBe(1);
    expect(entries(root).map(([name]) => name)).toEqual([
      'vanilla@chest.core_ui_vanilla_host',
      'inventory_take_progress_icon_button@common.inventory_take_progress_icon_button',
      'inventory_selected_icon_button@common.inventory_selected_icon_button',
      'gamepad_cursor@common.gamepad_cursor_button',
    ]);
  });

  it('keeps every binding expression literal', () => {
    eachControl(router, (name, control) => {
      for (const binding of control.bindings ?? []) {
        expect(binding.source_property_name ?? '', `${name} source_property_name`).not.toMatch(/\$/);
      }
    });
  });

  it('serves a screen with no layout at all', () => {
    const empty = buildRouter([]);

    expect(Object.keys(defs(empty))).toContain('core_ui_vanilla_gate');
    expect(entries(definition(empty, 'small_chest_panel'))).toHaveLength(4);
  });

  describe('refusals', () => {
    it('rejects a layout id past the transport ordinal', () => {
      expect(() => buildRouter([screen('far', MAX_LAYOUT + 1)])).toThrow(ContainerScreenError);
      expect(() => buildRouter([screen('far', TRANSPORT_ORDINAL)])).toThrow(/transport/);
      expect(() => buildRouter([screen('edge', MAX_LAYOUT)])).not.toThrow();
    });

    it('rejects a layout id below one', () => {
      expect(() => buildRouter([screen('zero', 0)])).toThrow(ContainerScreenError);
    });

    it('rejects two screens sharing a key or a name', () => {
      expect(() => buildRouter([screen('a', 1), screen('b', 1)])).toThrow(/share layout id 1/);
      expect(() => buildRouter([screen('a', 1), screen('a', 2)])).toThrow(/named "a"/);
    });
  });
});
