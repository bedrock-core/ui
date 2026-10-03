import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_form_components.input': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'bindings': [
        {
          binding_type: 'collection_details',
          binding_collection_name: 'custom_form',
        },
      ],
      'layer': 50,
      '$scale|default': '#font_scale_factor',
      '$static_texture|default': '',
      'controls': [
        {
          ['input@' + ref('core_ui_form_components.input_control')]: {
            $scale: '$scale',
            $static_texture: '$static_texture',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.input_control': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'edit_box',
      '$scale|default': '#font_scale_factor',
      '$static_texture|default': '',
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'layer': 2,
      '$field_enabled|default': true,
      'enabled': '$field_enabled',
      'text_box_name': 'custom_input',
      'text_edit_box_grid_collection_name': 'custom_form',
      'max_length': 100,
      'text_type': 'ExtendedASCII',
      'text_control': 'display_text_static',
      'place_holder_control': 'place_holder_static',
      'default_control': 'default',
      'hover_control': 'hover',
      'pressed_control': 'pressed',
      'locked_control': 'locked',
      'focus_enabled': true,
      'button_mappings': [
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'button.text_edit_box_selected',
          handle_select: true,
          handle_deselect: false,
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'button.text_edit_box_selected',
          handle_select: false,
          handle_deselect: true,
          mapping_type: 'global',
          consume_event: false,
        },
        {
          from_button_id: 'button.menu_ok',
          to_button_id: 'button.text_edit_box_selected',
          handle_select: true,
          handle_deselect: true,
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_ok',
          to_button_id: 'button.text_edit_box_selected',
          handle_select: false,
          handle_deselect: true,
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.menu_cancel',
          to_button_id: 'button.text_edit_box_deselected',
          handle_select: false,
          handle_deselect: true,
          mapping_type: 'global',
        },
        {
          to_button_id: 'button.text_edit_box_hovered',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_clear',
          to_button_id: 'button.text_edit_box_clear',
          handle_select: false,
          handle_deselect: false,
          mapping_type: 'focused',
        },
      ],
      'controls': [
        {
          text_area: {
            type: 'panel',
            layer: 5,
            size: ['100% - 4px', '100%'],
            anchor_from: 'left_middle',
            anchor_to: 'left_middle',
            clips_children: true,
            controls: [
              {
                ['display_text_static@' + ref('core_ui_components.label_static')]: {
                  $scale: '$scale',
                  localize: false,
                  text: '#item_name',
                  layer: 1,
                  use_anchored_offset: false,
                  size: ['default', 'default'],
                  min_size: ['100%', 0],
                  offset: [8, 0],
                  anchor_from: 'left_middle',
                  anchor_to: 'left_middle',
                  property_bag: {
                    '#property_field': '#item_name',
                    '#anchored_offset_value_x': 0,
                    '#anchored_offset_value_y': 0,
                  },
                  $native_binding: '#custom_input_text',
                  $native_target: '#item_name',
                  $payload_collection: 'custom_form',
                  $cell_details_binding_type: 'collection_details',
                  $details_collection: 'custom_form',
                },
              },
              {
                place_holder_visibility: {
                  type: 'panel',
                  size: ['100%', '100%'],
                  controls: [
                    {
                      placeholder_frame: {
                        type: 'panel',
                        size: [1, 1],
                        anchor_from: 'left_middle',
                        anchor_to: 'left_middle',
                        controls: [
                          {
                            ['place_holder_static@' + ref('core_ui_components.label_static')]: {
                              $scale: '$scale',
                              localize: false,
                              text: '#placeholder',
                              color: [0.7, 0.7, 0.7, 1],
                              layer: 1,
                              use_anchored_offset: false,
                              offset: [8, 0],
                              anchor_from: 'left_middle',
                              anchor_to: 'left_middle',
                              $native_binding: '#custom_placeholder_text',
                              $native_target: '#placeholder',
                              $payload_collection: 'custom_form',
                              $cell_details_binding_type: 'collection_details',
                              $details_collection: 'custom_form',
                            },
                          },
                        ],
                      },
                    },
                  ],
                  bindings: [
                    {
                      binding_type: 'collection',
                      binding_condition: 'always',
                      binding_collection_name: 'custom_form',
                      binding_name: '#custom_input_text',
                    },
                    {
                      binding_type: 'view',
                      source_property_name: '(#custom_input_text = \'\')',
                      target_property_name: '#visible',
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          ['default@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$static_texture',
          },
        },
        {
          ['hover@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$static_texture',
          },
        },
        {
          ['pressed@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$static_texture',
          },
        },
        {
          ['locked@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$static_texture',
          },
        },
      ],
    },
  }),
} satisfies TemplateModule;
