import { IDENTITY } from '@bedrock-core/ui-runtime/compile';
import type { CompiledScreen } from '../../compile';
import type { Control, Document, Modified } from '../../jsonui';
import { createSupportLinker, type UiSupport } from '../../support/link';
import { CHEST_HOST, chestRouter, type ChestHook, type ChestRouting } from './index';

export interface CompiledContainerPack extends ChestRouting {
  screens: CompiledScreen[];
  support: UiSupport;
}

/** The common container shell mounts every addon's insertion on the vanilla top half. */
const shellHook = (hook: ChestHook): Document => {
  const block = hook.namespace === 'data_driven_container';
  const identity = block ? '#core_ui_ddc_identity' : '#core_ui_identity';
  const root = block ? 'block_root' : 'chest_root';
  const hideVanilla: Modified = {
    modifications: [{
      array_name: 'bindings', operation: 'insert_back', value: [
        { binding_type: 'collection_details', binding_collection_name: CHEST_HOST.collection },
        {
          binding_name: '#item_durability_total_amount', binding_name_override: identity,
          binding_type: 'collection', binding_collection_name: CHEST_HOST.collection,
        },
        { binding_type: 'view', source_property_name: `(not (${identity} = ${IDENTITY.sentinel}))`, target_property_name: '#visible' },
      ],
    }],
  };

  return {
    namespace: hook.namespace,
    [`${block ? 'screen' : 'small_chest_screen'}@common.inventory_screen_common`]: {
      '$close_on_player_hurt|default': true,
      '$use_custom_pocket_toast|default': false,
      'close_on_player_hurt': '$close_on_player_hurt',
      'use_custom_pocket_toast': '$use_custom_pocket_toast',
      'variables': [
        {
          requires: '$desktop_screen', $screen_content: `core_ui_router.${root}`,
          $screen_bg_content: 'common.screen_background', $screen_background_alpha: 0.4,
        },
        {
          requires: '$pocket_screen', $use_custom_pocket_toast: true,
          $screen_content: `core_ui_router.${root}_pocket`,
        },
      ],
    },
    [block ? 'container_label' : 'chest_label']: hideVanilla,
    [block ? 'item_grid' : 'small_chest_grid']: structuredClone(hideVanilla),
  };
};

/** Links native container cells and both UI profiles into the addon's own pack. */
export function buildContainerPack(screens: readonly CompiledScreen[], addon: string): CompiledContainerPack {
  if (screens.some(screen => screen.addon !== addon)) { throw new Error('A container pack must contain screens from one addon namespace.'); }

  const linker = createSupportLinker(addon);
  const linked = screens.map(screen => ({
    ...screen,
    document: linker.link(screen.document),
    faces: linker.link<Record<string, Control>>(screen.faces),
    ...screen.testMetadata === undefined
      ? {}
      : {
          testMetadata: {
            ...screen.testMetadata,
            controls: screen.testMetadata.controls.map(control => ({ ...control, paths: control.paths.map(linker.path) })),
          },
        },
  }));
  const routing = chestRouter(screens, addon, { ...CHEST_HOST, routerNamespace: `${addon}__containers` });
  const hooks = routing.hooks.map((hook, index) => ({
    file: hook.file,
    document: linker.link({ ...shellHook(CHEST_HOST.hooks[index]), ...hook.document }),
  }));

  // Pack order may select either addon's shell. Each references the same vanilla
  // insertion panels, so it reaches all registered addon roots in either order.
  return { ...routing, hooks, router: linker.link(routing.router), screens: linked, support: linker.support() };
}
