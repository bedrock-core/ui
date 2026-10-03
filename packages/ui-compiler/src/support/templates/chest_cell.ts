import { IDENTITY } from '@bedrock-core/ui-runtime/compile';
import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_chest.item_renderer': (): TemplateDefinition => ({
    control: {
      type: 'custom',
      renderer: 'inventory_item_renderer',
      layer: 5,
      bindings: [
        {
          binding_type: 'collection_details',
          binding_collection_name: '$item_collection_name',
        },
        {
          binding_name: '#item_renderer_data',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'visible',
        },
        {
          binding_name: '#inactive_item',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
          binding_name_override: '#disabled_filter_visible',
          binding_condition: 'visible',
        },
        {
          binding_name: '#group_item_group_name',
          binding_condition: 'visible',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
        {
          binding_name: '#fade_in_icon_time_seconds',
          binding_condition: 'visible',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
      ],
    },
  }),
  'core_ui_chest.stack_count_label': (): TemplateDefinition => ({
    control: {
      ignored: '(not $stack_count_required)',
      type: 'label',
      color: '$item_stack_count_color',
      offset: [
        0,
        1,
      ],
      anchor_to: 'bottom_right',
      anchor_from: 'bottom_right',
      layer: 7,
      shadow: true,
      text: '#inventory_stack_count',
      bindings: [
        {
          binding_name: '#inventory_stack_count',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
      ],
    },
  }),
  'core_ui_chest.durability_bar': (): TemplateDefinition => ({
    control: {
      'ignored': '(not $durability_bar_required)',
      'type': 'custom',
      'renderer': 'progress_bar_renderer',
      'layer': 10,
      '$durability_bar_size|default': [
        12,
        1,
      ],
      '$durability_bar_offset|default': [
        0,
        5,
      ],
      'offset': '$durability_bar_offset',
      'size': '$durability_bar_size',
      'property_bag': {
        drop_shadow: true,
        is_durability: true,
        round_value: true,
      },
      'bindings': [
        {
          binding_name: '#item_durability_visible',
          binding_name_override: '#touch_progress_bar_visible',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
        {
          binding_name: '#item_durability_total_amount',
          binding_name_override: '#progress_bar_total_amount',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
        {
          binding_name: '#item_durability_current_amount',
          binding_name_override: '#progress_bar_current_amount',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
      ],
    },
  }),
  'core_ui_chest.hover_text': (): TemplateDefinition => ({
    control: {
      type: 'custom',
      renderer: 'hover_text_renderer',
      hover_text_max_width: 0,
      layer: 5,
      allow_clipping: false,
    },
  }),
  'core_ui_chest.hover_highlight': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      controls: [
        {
          highlight: {
            type: 'image',
            texture: 'textures/ui/highlight_slot',
            size: [
              '100% - 2px',
              '100% - 2px',
            ],
            alpha: 0.8,
            controls: [
              {
                ['hover_text@' + ref('core_ui_chest.hover_text')]: {
                  layer: 29,
                  bindings: [
                    {
                      binding_name: '#hover_text',
                      binding_name_override: '#hover_text',
                      binding_type: 'collection',
                      binding_collection_name: '$item_collection_name',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_chest.slot_button': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'button',
      '$focus_id|default': '',
      '$focus_override_down|default': '',
      '$focus_override_up|default': '',
      '$focus_override_left|default': '',
      '$focus_override_right|default': '',
      'focus_identifier': '$focus_id',
      'focus_change_down': '$focus_override_down',
      'focus_change_up': '$focus_override_up',
      'focus_change_left': '$focus_override_left',
      'focus_change_right': '$focus_override_right',
      'focus_enabled': true,
      'focus_wrap_enabled': false,
      'focus_magnet_enabled': true,
      '$highlight_control|default': ref('core_ui_chest.hover_highlight'),
      'default_focus_precedence': 1,
      'hover_control': 'hover',
      'layer': 1,
      'bindings': [
        {
          binding_type: 'collection_details',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'once',
        },
        {
          binding_type: 'collection',
          binding_name: '#focus_identifier',
          binding_name_override: '#focus_identifier',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'once',
        },
        {
          binding_type: 'collection',
          binding_name: '#focus_change_down',
          binding_name_override: '#focus_change_down',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'once',
        },
        {
          binding_type: 'collection',
          binding_name: '#focus_change_up',
          binding_name_override: '#focus_change_up',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'once',
        },
        {
          binding_type: 'collection',
          binding_name: '#focus_change_left',
          binding_name_override: '#focus_change_left',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'once',
        },
        {
          binding_type: 'collection',
          binding_name: '#focus_change_right',
          binding_name_override: '#focus_change_right',
          binding_collection_name: '$item_collection_name',
          binding_condition: 'once',
        },
      ],
      'button_mappings': [
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'button.container_take_all_place_all',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_ok',
          to_button_id: 'button.container_take_all_place_all',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.controller_back',
          to_button_id: 'button.container_take_all_place_all',
          mapping_type: 'pressed',
          ignored: '(not $is_ps4)',
        },
        {
          from_button_id: 'button.menu_secondary_select',
          to_button_id: 'button.container_take_half_place_one',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.controller_select',
          to_button_id: 'button.container_take_half_place_one',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_auto_place',
          to_button_id: 'button.container_auto_place',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.controller_secondary_select',
          to_button_id: 'button.container_auto_place',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'button.coalesce_stack',
          mapping_type: 'double_pressed',
        },
        {
          from_button_id: 'button.menu_ok',
          to_button_id: 'button.coalesce_stack',
          mapping_type: 'double_pressed',
        },
        {
          to_button_id: 'button.shape_drawing',
          mapping_type: 'pressed',
        },
        {
          to_button_id: 'button.container_slot_hovered',
          mapping_type: 'pressed',
        },
      ],
      'controls': [
        {
          'hover@$highlight_control': {},
        },
      ],
    },
  }),
  'core_ui_chest.display_states': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_chest.slot_button'),
    control: {
      button_mappings: [],
      focus_enabled: false,
    },
  }),
  'core_ui_chest.cell_bg': (): TemplateDefinition => ({
    control: {
      type: 'panel',
      controls: [
        {
          cell_image: {
            type: 'image',
            texture: 'textures/ui/cell_image',
            layer: 1,
            bindings: [
              {
                binding_name: '(not #is_selected_slot)',
                binding_name_override: '#visible',
                binding_type: 'collection',
                binding_collection_name: '$item_collection_name',
              },
            ],
          },
        },
        {
          cell_image_selected: {
            type: 'image',
            texture: 'textures/ui/recipe_book_touch_cell_selected',
            layer: 1,
            visible: false,
            bindings: [
              {
                binding_name: '#is_selected_slot',
                binding_name_override: '#visible',
                binding_type: 'collection',
                binding_collection_name: '$item_collection_name',
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_chest.slot_selected': (): TemplateDefinition => ({
    control: {
      type: 'image',
      texture: 'textures/ui/pocket_ui_highlight_selected_slot',
      size: [
        '100% + 5px',
        '100% + 5px',
      ],
      visible: false,
      layer: 20,
      bindings: [
        {
          binding_name: '#is_selected_slot',
          binding_name_override: '#visible',
          binding_type: 'collection',
          binding_collection_name: '$item_collection_name',
        },
      ],
      controls: [
        {
          hold_release: {
            type: 'custom',
            renderer: 'progress_bar_renderer',
            variables: [
              {
                requires: '$desktop_screen',
                $bar_offset: [
                  0,
                  -7,
                ],
                $bar_size: [
                  15,
                  3,
                ],
              },
              {
                requires: '$pocket_screen',
                $bar_offset: [
                  0,
                  -12,
                ],
                $bar_size: [
                  25,
                  2,
                ],
              },
            ],
            layer: 70,
            offset: '$bar_offset',
            size: '$bar_size',
            bindings: [
              {
                binding_name: '#touch_progress_bar_visible',
                binding_condition: 'always',
              },
              {
                binding_name: '#progress_bar_total_amount',
                binding_condition: 'always_when_visible',
              },
              {
                binding_name: '#progress_bar_current_amount',
                binding_condition: 'always_when_visible',
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_chest.cell': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'input_panel',
      'size': [
        18,
        18,
      ],
      'layer': 1,
      '$cell_image_size|default': [
        18,
        18,
      ],
      '$button_ref|default': ref('core_ui_chest.slot_button'),
      '$stack_count_required|default': true,
      '$durability_bar_required|default': true,
      '$item_renderer|default': ref('core_ui_chest.item_renderer'),
      '$item_renderer_panel_size|default': [
        18,
        18,
      ],
      '$item_renderer_size|default': [
        16,
        16,
      ],
      '$item_renderer_offset|default': [
        0,
        0,
      ],
      '$background_images|default': ref('core_ui_chest.cell_bg'),
      '$focus_id|default': '',
      '$focus_override_down|default': '',
      '$focus_override_up|default': '',
      '$focus_override_left|default': '',
      '$focus_override_right|default': '',
      'focus_identifier': '$focus_id',
      'focus_change_down': '$focus_override_down',
      'focus_change_up': '$focus_override_up',
      'focus_change_left': '$focus_override_left',
      'focus_change_right': '$focus_override_right',
      'focus_enabled': true,
      'focus_wrap_enabled': false,
      'focus_magnet_enabled': true,
      'tts_ignore_count': true,
      'controls': [
        {
          item_cell: {
            type: 'panel',
            size: '$cell_image_size',
            layer: 0,
            controls: [
              {
                'bg@$background_images': {
                  layer: 1,
                },
              },
              {
                item: {
                  type: 'panel',
                  size: '$item_renderer_panel_size',
                  layer: 0,
                  controls: [
                    {
                      ['stack_count_label@' + ref('core_ui_chest.stack_count_label')]: {
                        layer: 27,
                      },
                    },
                    {
                      'renderer@$item_renderer': {
                        size: '$item_renderer_size',
                        offset: '$item_renderer_offset',
                        anchor_to: 'center',
                        anchor_from: 'center',
                        layer: 7,
                      },
                    },
                  ],
                },
              },
              {
                ['durability_bar@' + ref('core_ui_chest.durability_bar')]: {
                  layer: 20,
                },
              },
            ],
          },
        },
        {
          ['item_selected_image@' + ref('core_ui_chest.slot_selected')]: {
            layer: 4,
          },
        },
        {
          'item_button_ref@$button_ref': {
            tts_ignore_count: true,
            tts_skip_message: true,
            tts_inherit_siblings: true,
            layer: 5,
          },
        },
      ],
    },
  }),
  'core_ui_chest.empty': (): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        0,
        0,
      ],
    },
  }),
  'core_ui_chest.slot_host': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'stack_panel',
      'orientation': 'vertical',
      'size': [
        18,
        18,
      ],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'collection_name': 'container_items',
      '$slot|default': 0,
      '$cell|default': ref('core_ui_chest.slot'),
      'controls': [
        {
          'cell@$cell': {
            collection_index: '$slot',
          },
        },
      ],
    },
  }),
  'core_ui_chest.slot': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        18,
        18,
      ],
      controls: [
        {
          ['item@' + ref('core_ui_chest.cell')]: {
            $item_collection_name: 'container_items',
          },
        },
      ],
    },
  }),
  'core_ui_chest.locked_slot': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        18,
        18,
      ],
      controls: [
        {
          ['item@' + ref('core_ui_chest.cell')]: {
            $item_collection_name: 'container_items',
            $button_ref: ref('core_ui_chest.display_states'),
          },
        },
      ],
    },
  }),
  'core_ui_chest.output_slot': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [
        18,
        18,
      ],
      controls: [
        {
          ['item@' + ref('core_ui_chest.cell')]: {
            $item_collection_name: 'container_items',
          },
        },
        {
          empty_guard: {
            type: 'input_panel',
            size: [
              '100%',
              '100%',
            ],
            layer: 30,
            focus_enabled: false,
            button_mappings: [
              {
                from_button_id: 'button.menu_select',
                to_button_id: 'button.menu_select',
                mapping_type: 'pressed',
                consume_event: true,
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
                source_property_name: `(#identity = ${IDENTITY.guard})`,
                target_property_name: '#visible',
              },
            ],
            controls: [
              {
                face: {
                  type: 'image',
                  texture: 'textures/ui/cell_image',
                  size: [
                    18,
                    18,
                  ],
                  layer: 1,
                },
              },
            ],
          },
        },
      ],
    },
  }),
} satisfies TemplateModule;
