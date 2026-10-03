import { IDENTITY } from '@bedrock-core/ui-runtime/compile';
import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_router.vanilla_host_desktop': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%',
        '100%',
      ],
      collection_name: 'container_items',
      controls: [
        {
          ['gate@' + ref('core_ui_router.vanilla_gate_desktop')]: {
            collection_index: 0,
          },
        },
      ],
    },
  }),
  'core_ui_router.vanilla_host_pocket': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%',
        '100%',
      ],
      collection_name: 'container_items',
      controls: [
        {
          ['gate@' + ref('core_ui_router.vanilla_gate_pocket')]: {
            collection_index: 0,
          },
        },
      ],
    },
  }),
  'core_ui_router.claimed_host': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%',
        '100%',
      ],
      collection_name: 'container_items',
      controls: [
        {
          ['gate@' + ref('core_ui_router.claimed_gate')]: {
            collection_index: 0,
          },
        },
      ],
    },
  }),
  'core_ui_router.vanilla_gate': (): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        '100%',
        '100%',
      ],
      bindings: [
        {
          binding_type: 'collection_details',
          binding_collection_name: 'container_items',
        },
        {
          binding_name: '#item_durability_total_amount',
          binding_name_override: '#identity',
          binding_type: 'collection',
          binding_collection_name: 'container_items',
        },
        {
          binding_type: 'view',
          source_property_name: `(not (#identity = ${IDENTITY.sentinel}))`,
          target_property_name: '#visible',
        },
      ],
    },
  }),
  'core_ui_router.vanilla_gate_desktop': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_router.vanilla_gate'),
    control: {
      controls: [
        {
          'vanilla@chest.small_chest_panel': {},
        },
      ],
    },
  }),
  'core_ui_router.vanilla_gate_pocket': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_router.vanilla_gate'),
    control: {
      controls: [
        {
          'vanilla@pocket_containers.small_chest_panel': {},
        },
      ],
    },
  }),
  'core_ui_router.claimed_gate': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        '100%',
        '100%',
      ],
      controls: [
        {
          ['chrome@' + ref('core_ui_chest.chrome')]: {},
        },
        {
          'roots@chest.small_chest_panel_top_half': {
            size: [
              '100%',
              '100%',
            ],
            offset: [
              0,
              0,
            ],
            anchor_from: 'center',
            anchor_to: 'center',
          },
        },
      ],
      bindings: [
        {
          binding_type: 'collection_details',
          binding_collection_name: 'container_items',
        },
        {
          binding_name: '#item_durability_total_amount',
          binding_name_override: '#identity',
          binding_type: 'collection',
          binding_collection_name: 'container_items',
        },
        {
          binding_type: 'view',
          source_property_name: `(#identity = ${IDENTITY.sentinel})`,
          target_property_name: '#visible',
        },
      ],
    },
  }),
  'core_ui_router.chest_root': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        '100%',
        '100%',
      ],
      controls: [
        {
          ['vanilla@' + ref('core_ui_router.vanilla_host_desktop')]: {},
        },
        {
          ['claimed@' + ref('core_ui_router.claimed_host')]: {},
        },
      ],
    },
  }),
  'core_ui_router.chest_root_pocket': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        '100%',
        '100%',
      ],
      controls: [
        {
          ['vanilla@' + ref('core_ui_router.vanilla_host_pocket')]: {},
        },
        {
          ['claimed@' + ref('core_ui_router.claimed_host')]: {},
        },
      ],
    },
  }),
  'core_ui_router.block_vanilla_host_desktop': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%',
        '100%',
      ],
      collection_name: 'container_items',
      controls: [
        {
          ['gate@' + ref('core_ui_router.block_vanilla_gate_desktop')]: {
            collection_index: 0,
          },
        },
      ],
    },
  }),
  'core_ui_router.block_vanilla_host_pocket': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%',
        '100%',
      ],
      collection_name: 'container_items',
      controls: [
        {
          ['gate@' + ref('core_ui_router.block_vanilla_gate_pocket')]: {
            collection_index: 0,
          },
        },
      ],
    },
  }),
  'core_ui_router.block_claimed_host': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [
        '100%',
        '100%',
      ],
      collection_name: 'container_items',
      controls: [
        {
          ['gate@' + ref('core_ui_router.block_claimed_gate')]: {
            collection_index: 0,
          },
        },
      ],
    },
  }),
  'core_ui_router.block_vanilla_gate_desktop': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_router.vanilla_gate'),
    control: {
      controls: [
        {
          'vanilla@data_driven_container.desktop_panel': {},
        },
      ],
    },
  }),
  'core_ui_router.block_vanilla_gate_pocket': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_router.vanilla_gate'),
    control: {
      controls: [
        {
          'vanilla@pocket_containers.data_driven_container_panel': {},
        },
      ],
    },
  }),
  'core_ui_router.block_claimed_gate': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_router.claimed_gate'),
    control: {
      controls: [
        {
          ['chrome@' + ref('core_ui_chest.chrome')]: {},
        },
        {
          'roots@data_driven_container.panel_top_half': {
            size: [
              '100%',
              '100%',
            ],
            offset: [
              0,
              0,
            ],
            anchor_from: 'center',
            anchor_to: 'center',
          },
        },
      ],
    },
  }),
  'core_ui_router.block_root': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        '100%',
        '100%',
      ],
      controls: [
        {
          ['vanilla@' + ref('core_ui_router.block_vanilla_host_desktop')]: {},
        },
        {
          ['claimed@' + ref('core_ui_router.block_claimed_host')]: {},
        },
      ],
    },
  }),
  'core_ui_router.block_root_pocket': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        '100%',
        '100%',
      ],
      controls: [
        {
          ['vanilla@' + ref('core_ui_router.block_vanilla_host_pocket')]: {},
        },
        {
          ['claimed@' + ref('core_ui_router.block_claimed_host')]: {},
        },
      ],
    },
  }),
} satisfies TemplateModule;
