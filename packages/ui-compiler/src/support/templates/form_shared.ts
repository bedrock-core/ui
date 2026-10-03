import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_form_components.option_face': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'size': ['100%', '100%'],
      '$face_skip|default': '(\'%.590s\' * #custom_radio_text)',
      '$bullet_skip|default': '(\'%.839s\' * #custom_radio_text)',
      'controls': [
        {
          bg: {
            type: 'image',
            size: ['100%', '100%'],
            offset: [0, 0],
            fill: false,
            anchor_to: 'center',
            anchor_from: 'center',
            texture: '#texture',
            visible: '#visible',
            alpha: 1,
            bindings: [
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
                source_property_name: '$face_skip',
                target_property_name: '#skip_to_opt_bg',
                binding_condition: 'visible',
              },
              {
                binding_type: 'view',
                source_property_name: '(#custom_radio_text - #skip_to_opt_bg)',
                target_property_name: '#rem_at_opt_bg',
                binding_condition: 'visible',
              },
              {
                binding_type: 'view',
                source_property_name: '(\'%.83s\' * #rem_at_opt_bg)',
                target_property_name: '#raw_opt_bg',
                binding_condition: 'visible',
              },
              {
                binding_type: 'view',
                source_property_name: '((\'%.82s\' * #raw_opt_bg) - (\'%.2s\' * #raw_opt_bg) - \';\')',
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
        },
        {
          ['bullet@' + ref('core_ui_form_components.inline_bullet')]: {
            $bullet_skip: '$bullet_skip',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.option_toggle': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_form_components.toggle_base'),
    control: {
      size: ['100%', '100%'],
      $radio_toggle_group: true,
      $toggle_name: 'custom_dropdown_radio_toggle',
      $toggle_binding_type: 'collection',
      $toggle_grid_collection_name: 'custom_dropdown',
      $toggle_state_binding_name: '#custom_radio_toggled',
      $toggle_details_binding_type: 'collection_details',
      controls: [
        {
          ['unchecked@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.590s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.839s\' * #custom_radio_text)',
          },
        },
        {
          ['checked@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.756s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.922s\' * #custom_radio_text)',
          },
        },
        {
          ['unchecked_hover@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.673s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.1503s\' * #custom_radio_text)',
          },
        },
        {
          ['checked_hover@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.756s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.1586s\' * #custom_radio_text)',
          },
        },
        {
          ['unchecked_locked@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.590s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.839s\' * #custom_radio_text)',
          },
        },
        {
          ['checked_locked@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.756s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.922s\' * #custom_radio_text)',
          },
        },
        {
          ['unchecked_locked_hover@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.590s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.839s\' * #custom_radio_text)',
          },
        },
        {
          ['checked_locked_hover@' + ref('core_ui_form_components.option_face')]: {
            $face_skip: '(\'%.756s\' * #custom_radio_text)',
            $bullet_skip: '(\'%.922s\' * #custom_radio_text)',
          },
        },
      ],
    },
  }),
  'core_ui_form_components.option_label_frame': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [1, 1],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      controls: [
        {
          ['option_label@' + ref('core_ui_form_components.option_label')]: {},
        },
      ],
    },
  }),
  'core_ui_form_components.option_label': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_components.label'),
    control: {
      layer: 10,
      $payload_collection: 'custom_dropdown',
      $payload_binding: '#custom_radio_text',
      $cell_details_binding_type: 'collection_details',
      $label_skip: '(\'%.92s\' * #payload)',
    },
  }),
} satisfies TemplateModule;
