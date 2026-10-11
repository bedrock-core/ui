import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_form_components.dropdown': ({ ref }): TemplateDefinition => ({
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
      '$hover_texture|default': '',
      '$pressed_texture|default': '',
      '$locked_texture|default': '',
      '$dropdown_area|default': 'inside_header_panel',
      '$current_font_type|default': 'default',
      '$current_font_scale|default': 2,
      '$current_color|default': '',
      '$current_offset|default': [8, -4],
      'controls': [
        {
          ['dropdown_control@' + ref('core_ui_form_components.dropdown_control')]: {
            $static_texture: '$static_texture',
            $hover_texture: '$hover_texture',
            $pressed_texture: '$pressed_texture',
            $locked_texture: '$locked_texture',
            $dropdown_area: '$dropdown_area',
          },
        },
        {
          ['dropdown_current_label@' + ref('core_ui_form_components.dropdown_current_label')]: {
            layer: 20,
            $scale: '$scale',
            $current_font_type: '$current_font_type',
            $current_font_scale: '$current_font_scale',
            $current_color: '$current_color',
            $current_offset: '$current_offset',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_control': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      '$static_texture|default': '',
      '$hover_texture|default': '',
      '$pressed_texture|default': '',
      '$locked_texture|default': '',
      '$dropdown_area|default': 'inside_header_panel',
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'layer': 2,
      'controls': [
        {
          ['custom_dropdown@' + ref('core_ui_form_components.dropdown_closed_box')]: {
            type: 'dropdown',
            anchor_from: 'top_left',
            anchor_to: 'top_left',
            dropdown_name: 'custom_dropdown',
            dropdown_content_control: 'dropdown_content',
            dropdown_area: '$dropdown_area',
            $static_texture: '$static_texture',
            $hover_texture: '$hover_texture',
            $pressed_texture: '$pressed_texture',
            $locked_texture: '$locked_texture',
            $toggle_name: 'custom_dropdown',
            $toggle_state_binding_name: '#custom_dropdown',
          },
        },
        {
          dropdown_content: {
            type: 'input_panel',
            layer: 200,
            size: ['100%', '1000%'],
            anchor_from: 'top_left',
            anchor_to: 'top_left',
            property_bag: {
              '#is_dropdown': true,
            },
            bindings: [
              {
                binding_type: 'view',
                source_control_name: 'custom_dropdown',
                source_property_name: '#toggle_state',
                target_property_name: '#visible',
                resolve_sibling_scope: true,
              },
            ],
            button_mappings: [
              {
                from_button_id: 'button.menu_cancel',
                to_button_id: 'button.dropdown_exit',
                mapping_type: 'global',
              },
              {
                from_button_id: 'button.menu_ok',
                to_button_id: 'button.dropdown_exit',
                mapping_type: 'global',
              },
              {
                from_button_id: 'button.menu_select',
                to_button_id: 'button.dropdown_exit',
                mapping_type: 'global',
              },
              {
                from_button_id: 'button.menu_up',
                to_button_id: 'button.menu_up',
                mapping_type: 'global',
                scope: 'view',
              },
              {
                from_button_id: 'button.menu_down',
                to_button_id: 'button.menu_down',
                mapping_type: 'global',
                scope: 'view',
              },
              {
                from_button_id: 'button.menu_left',
                to_button_id: 'button.menu_left',
                mapping_type: 'global',
                scope: 'view',
              },
              {
                from_button_id: 'button.menu_right',
                to_button_id: 'button.menu_right',
                mapping_type: 'global',
                scope: 'view',
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_popup_router': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'visible': '#visible',
      'property_bag': {
        '#visible': false,
      },
      '$popup_texture|default': '',
      '$popup_size|default': [312, 20],
      '$options_size|default': ['100%', '100%c'],
      '$open_gate|default': '((#type = \'modal-dropdown\') and #custom_dropdown)',
      'bindings': [
        {
          binding_type: 'collection_details',
          binding_collection_name: 'custom_form',
        },
        {
          binding_name: '#custom_text',
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.9s\' * #custom_text)',
          target_property_name: '#pr_header',
        },
        {
          binding_type: 'view',
          source_property_name: '(#custom_text - #pr_header)',
          target_property_name: '#rem_hdr',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.83s\' * #rem_hdr)',
          target_property_name: '#raw_type',
        },
        {
          binding_type: 'view',
          source_property_name: '((\'%.82s\' * #raw_type) - (\'%.2s\' * #raw_type) - \';\')',
          target_property_name: '#type',
        },
        {
          binding_name: '#custom_dropdown',
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
        },
        {
          binding_type: 'view',
          source_property_name: '$open_gate',
          target_property_name: '#visible',
        },
      ],
      'controls': [
        {
          popup_center: {
            type: 'panel',
            size: [1, 1],
            anchor_from: 'center',
            anchor_to: 'center',
            controls: [
              {
                ['popup_card_static@' + ref('core_ui_form_components.dropdown_popup_card_static')]: {
                  $popup_texture: '$popup_texture',
                  $popup_size: '$popup_size',
                  $options_size: '$options_size',
                },
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_popup_card_static': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      '$popup_size|default': [312, 20],
      '$popup_texture|default': '',
      'size': '$popup_size',
      '$options_size|default': ['100%', '100%c'],
      'anchor_from': 'center',
      'anchor_to': 'center',
      'controls': [
        {
          ['background@' + ref('core_ui_form_components.dropdown_popup_background_static')]: {
            $popup_texture: '$popup_texture',
          },
        },
        {
          ['popup_scroll@' + ref('core_ui_form_components.dropdown_popup_scroll')]: {
            $options_size: '$options_size',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_popup_scroll': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'scroll_view',
      ['$options_size|default']: ['100%', '100%c'],
      size: ['100%', '100%'],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      layer: 2,
      scroll_speed: 15,
      always_handle_scrolling: true,
      allow_scroll_even_when_content_fits: false,
      scrollbar_track_button: 'button.scrollbar_skip_track',
      scrollbar_touch_button: 'button.scrollbar_touch',
      always_listen_to_input: true,
      always_handle_pointer: true,
      scroll_content: 'scrolling_content',
      scroll_view_port: 'scrolling_view_port',
      scrollbar_track: 'track',
      scrollbar_box: 'box',
      scroll_box_and_track_panel: 'bar_and_track',
      button_mappings: [
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'button.scrollbar_touch',
          mapping_type: 'pressed',
          button_up_right_of_first_refusal: true,
        },
      ],
      controls: [
        {
          scrolling_view_port: {
            type: 'panel',
            size: ['100%', '100%'],
            anchor_from: 'top_left',
            anchor_to: 'top_left',
            clips_children: true,
            controls: [
              {
                ['scrolling_content@' + ref('core_ui_form_components.dropdown_options')]: {
                  anchor_from: 'top_left',
                  anchor_to: 'top_left',
                  $options_size: '$options_size',
                },
              },
            ],
          },
        },
        {
          ['bar_and_track@' + ref('core_ui_shapes.scrollbar')]: {},
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_current_label': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'layer': 20,
      '$scale|default': '#font_scale_factor',
      'size': ['100%', 1],
      'anchor_from': 'left_middle',
      'anchor_to': 'left_middle',
      'controls': [
        {
          ['display_text_static@' + ref('core_ui_form_components.dropdown_current_value_text_static')]: {
            $scale: '$scale',
            $current_font_type: '$current_font_type',
            $current_font_scale: '$current_font_scale',
            $current_color: '$current_color',
            $current_offset: '$current_offset',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_current_value_text_static': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_components.label'),
    control: {
      size: ['100% - 16px', 'default'],
      offset: '$current_offset',
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      use_anchored_offset: false,
      font_type: '$current_font_type',
      font_scale_factor: '$current_font_scale',
      bindings: [
        {
          binding_name: '#dropdown_option_text',
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.424s\' * #dropdown_option_text)',
          target_property_name: '#skip_to_text',
        },
        {
          binding_type: 'view',
          source_property_name: '(#dropdown_option_text - #skip_to_text)',
          target_property_name: '#rem_at_text',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.83s\' * #rem_at_text)',
          target_property_name: '#raw_opt_text',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'§r\' + $current_color + ((\'%.82s\' * #raw_opt_text) - (\'%.2s\' * #raw_opt_text) - \';\'))',
          target_property_name: '#text',
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_closed_box': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_form_components.toggle_base'),
    control: {
      'size': ['100%', '100%'],
      '$static_texture|default': '',
      '$hover_texture|default': '',
      '$pressed_texture|default': '',
      '$locked_texture|default': '',
      'focus_wrap_enabled': true,
      '$toggle_binding_type': 'collection',
      '$toggle_grid_collection_name': 'custom_form',
      'controls': [
        {
          ['unchecked@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$static_texture',
          },
        },
        {
          ['checked@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$pressed_texture',
          },
        },
        {
          ['unchecked_hover@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$hover_texture',
          },
        },
        {
          ['checked_hover@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$pressed_texture',
          },
        },
        {
          ['unchecked_locked@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$locked_texture',
          },
        },
        {
          ['checked_locked@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$locked_texture',
          },
        },
        {
          ['unchecked_locked_hover@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$locked_texture',
          },
        },
        {
          ['checked_locked_hover@' + ref('core_ui_common.modal_state_face')]: {
            $static_texture: '$locked_texture',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.dropdown_popup_background_static': (): TemplateDefinition => ({
    control: {
      'type': 'image',
      'layer': 1,
      'size': ['100%', '100%'],
      'keep_ratio': false,
      '$popup_texture|default': '',
      'texture': '$popup_texture',
    },
  }),
  'core_ui_form_components.dropdown_options': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      ['$options_size|default']: ['100%', '100%c'],
      size: '$options_size',
      controls: [
        {
          options_inset: {
            type: 'panel',
            size: ['100%-2px', '100%c'],
            offset: [0, 1],
            anchor_from: 'top_middle',
            anchor_to: 'top_middle',
            controls: [
              {
                radio_control_group: {
                  type: 'stack_panel',
                  orientation: 'vertical',
                  size: ['100%', '100%c'],
                  anchor_from: 'top_left',
                  anchor_to: 'top_left',
                  factory: {
                    name: 'buttons',
                    control_name: ref('core_ui_form_components.dropdown_option_radio'),
                  },
                  collection_name: 'custom_dropdown',
                  bindings: [
                    {
                      binding_name: '#custom_dropdown_length',
                      binding_type: 'collection',
                      binding_name_override: '#collection_length',
                      binding_collection_name: 'custom_form',
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
  'core_ui_form_components.dropdown_option_radio': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      size: ['100%', '17px'],
      controls: [
        {
          ['option_toggle@' + ref('core_ui_form_components.option_toggle')]: {
            size: ['100%', '100%+1px'],
            anchor_from: 'top_left',
            anchor_to: 'top_left',
          },
        },
        {
          ['label_frame@' + ref('core_ui_form_components.option_label_frame')]: {},
        },
      ],
    },
  }),
} satisfies TemplateModule;
