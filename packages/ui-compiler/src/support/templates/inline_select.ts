import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_form_components.inline_dropdown_toggle_stub': (): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [0, 0],
      visible: false,
    },
  }),
  'core_ui_form_components.compiled_option_toggle': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_form_components.toggle_base'),
    control: {
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      layer: 2,
      $radio_toggle_group: true,
      $toggle_name: 'custom_dropdown_radio_toggle',
      $toggle_binding_type: 'collection',
      $toggle_binding_condition: 'always',
      $toggle_grid_collection_name: 'custom_dropdown',
      $toggle_state_binding_name: '#custom_radio_toggled',
      $toggle_details_binding_type: 'collection_details',
    },
  }),
  'core_ui_form_components.inline_bullet': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'size': [1, 1],
      'anchor_from': 'left_middle',
      'anchor_to': 'left_middle',
      'layer': 11,
      '$bullet_skip|default': '(\'%.839s\' * #custom_radio_text)',
      'controls': [
        {
          ['bullet_box@' + ref('core_ui_form_components.inline_bullet_box')]: {
            $bullet_skip: '$bullet_skip',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.inline_bullet_box': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'size': [0, 0],
      'anchor_from': 'left_middle',
      'anchor_to': 'left_middle',
      '$bullet_skip|default': '(\'%.839s\' * #custom_radio_text)',
      'property_bag': {
        '#size_binding_x': 0,
        '#size_binding_y': 0,
      },
      'bindings': [
        {
          binding_name: '#custom_radio_text',
          binding_type: 'collection',
          binding_condition: 'always',
          binding_collection_name: 'custom_dropdown',
        },
        {
          binding_type: 'collection_details',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.1337s\' * #custom_radio_text)',
          target_property_name: '#skip_bullet_w',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(#custom_radio_text - #skip_bullet_w)',
          target_property_name: '#rem_bullet_w',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.83s\' * #rem_bullet_w)',
          target_property_name: '#raw_bullet_w',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(((\'%.82s\' * #raw_bullet_w) - (\'%.2s\' * #raw_bullet_w) - \';\') * 1)',
          target_property_name: '#size_binding_x',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.1420s\' * #custom_radio_text)',
          target_property_name: '#skip_bullet_h',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(#custom_radio_text - #skip_bullet_h)',
          target_property_name: '#rem_bullet_h',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.83s\' * #rem_bullet_h)',
          target_property_name: '#raw_bullet_h',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(((\'%.82s\' * #raw_bullet_h) - (\'%.2s\' * #raw_bullet_h) - \';\') * 1)',
          target_property_name: '#size_binding_y',
          binding_condition: 'visible',
        },
      ],
      'controls': [
        {
          ['img@' + ref('core_ui_form_components.inline_bullet_img')]: {
            $bullet_skip: '$bullet_skip',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.inline_bullet_img': (): TemplateDefinition => ({
    control: {
      'type': 'image',
      'size': ['100%', '100%'],
      '$bullet_skip|default': '(\'%.839s\' * #custom_radio_text)',
      'texture': '#texture',
      'visible': '#visible',
      'bindings': [
        {
          binding_name: '#custom_radio_text',
          binding_type: 'collection',
          binding_condition: 'always',
          binding_collection_name: 'custom_dropdown',
        },
        {
          binding_type: 'collection_details',
        },
        {
          binding_type: 'view',
          source_property_name: '$bullet_skip',
          target_property_name: '#skip_texture',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(#custom_radio_text - #skip_texture)',
          target_property_name: '#rem_texture',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'%.83s\' * #rem_texture)',
          target_property_name: '#raw_texture',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '((\'%.82s\' * #raw_texture) - (\'%.2s\' * #raw_texture) - \';\')',
          target_property_name: '#texture',
          binding_condition: 'visible',
        },
        {
          binding_type: 'view',
          source_property_name: '(not (#texture = \'\'))',
          target_property_name: '#visible',
          binding_condition: 'visible',
        },
      ],
    },
  }),
} satisfies TemplateModule;
