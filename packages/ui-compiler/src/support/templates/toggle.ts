import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_form_components.toggle': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_form_components.toggle_base'),
    control: {
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'layer': 2,
      '$field_enabled|default': true,
      'enabled': '$field_enabled',
      'focus_enabled': true,
      'focus_magnet_enabled': true,
      'focus_wrap_enabled': true,
      'default_focus_precedence': 0,
      '$toggle_name': 'custom_toggle',
      '$toggle_grid_collection_name': 'custom_form',
      '$off|default': 'textures/ui/unstyled',
      '$on|default': 'textures/ui/unstyled',
      '$off_hover|default': 'textures/ui/unstyled',
      '$on_hover|default': 'textures/ui/unstyled',
      '$off_locked|default': 'textures/ui/unstyled',
      '$on_locked|default': 'textures/ui/unstyled',
      'bindings': [
        {
          binding_type: 'collection_details',
          binding_collection_name: 'custom_form',
        },
        {
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
          binding_name: '#custom_toggle_state',
          binding_name_override: '#toggle_state',
        },
      ],
      'controls': [
        {
          ['unchecked@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$off',
          },
        },
        {
          ['checked@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$on',
          },
        },
        {
          ['unchecked_hover@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$off_hover',
          },
        },
        {
          ['checked_hover@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$on_hover',
          },
        },
        {
          ['unchecked_locked@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$off_locked',
          },
        },
        {
          ['checked_locked@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$on_locked',
          },
        },
        {
          ['unchecked_locked_hover@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$off_locked',
          },
        },
        {
          ['checked_locked_hover@' + ref('core_ui_common.static_face')]: {
            $face_texture: '$on_locked',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.toggle_base': (): TemplateDefinition => ({
    control: {
      'type': 'toggle',
      'layer': 1,
      '$field_enabled|default': true,
      'enabled': '$field_enabled',
      'sound_name': 'random.click',
      'sound_volume': 1,
      'sound_pitch': 1,
      'focus_enabled': true,
      'focus_magnet_enabled': true,
      'default_focus_precedence': 0,
      'checked_control': 'checked',
      'unchecked_control': 'unchecked',
      'checked_hover_control': 'checked_hover',
      'unchecked_hover_control': 'unchecked_hover',
      'checked_locked_control': 'checked_locked',
      'unchecked_locked_control': 'unchecked_locked',
      'checked_locked_hover_control': 'checked_locked_hover',
      'unchecked_locked_hover_control': 'unchecked_locked_hover',
      '$toggle_name|default': 'toggle',
      '$toggle_binding_type|default': 'global',
      '$toggle_binding_condition|default': 'visible',
      '$toggle_state_binding_name|default': '#toggle_state',
      '$toggle_grid_collection_name|default': '',
      '$toggle_details_binding_type|default': 'none',
      '$radio_toggle_group|default': false,
      '$toggle_group_forced_index|default': -1,
      '$toggle_group_default_selected|default': 0,
      'radio_toggle_group': '$radio_toggle_group',
      'toggle_name': '$toggle_name',
      'toggle_default_state': false,
      'toggle_group_forced_index': '$toggle_group_forced_index',
      'toggle_group_default_selected': '$toggle_group_default_selected',
      'toggle_grid_collection_name': '$toggle_grid_collection_name',
      'enable_directional_toggling': false,
      'toggle_on_button': 'toggle.toggle_on',
      'toggle_off_button': 'toggle.toggle_off',
      'button_mappings': [
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'button.menu_select',
          mapping_type: 'pressed',
        },
        {
          from_button_id: 'button.menu_ok',
          to_button_id: 'button.menu_ok',
          mapping_type: 'focused',
        },
        {
          from_button_id: 'button.controller_back',
          to_button_id: 'button.controller_back',
          mapping_type: 'focused',
          ignored: true,
        },
      ],
      'property_bag': {
        '#toggle_state': true,
      },
      'bindings': [
        {
          binding_type: '$toggle_binding_type',
          binding_condition: '$toggle_binding_condition',
          binding_collection_name: '$toggle_grid_collection_name',
          binding_name: '$toggle_state_binding_name',
          binding_name_override: '#toggle_state',
        },
        {
          binding_type: 'none',
          binding_condition: 'visible',
          binding_collection_name: '$toggle_grid_collection_name',
          binding_name: '#toggle_enabled',
          binding_name_override: '#enabled',
        },
        {
          binding_type: '$toggle_details_binding_type',
          binding_collection_name: '',
        },
      ],
    },
  }),
} satisfies TemplateModule;
