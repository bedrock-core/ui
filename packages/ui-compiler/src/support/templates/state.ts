import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_common.state_face': (): TemplateDefinition => ({
    control: {
      'type': 'panel',
      'size': ['100%', '100%'],
      'anchor_from': 'center',
      'anchor_to': 'center',
      '$static_texture|default': 'textures/ui/unstyled',
      'controls': [
        {
          bg_static: {
            type: 'image',
            size: ['100%', '100%'],
            anchor_from: 'center',
            anchor_to: 'center',
            keep_ratio: false,
            texture: '$static_texture',
          },
        },
      ],
    },
  }),
  'core_ui_common.modal_state_face': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_common.state_face'),
    control: {},
  }),
  'core_ui_common.static_face': (): TemplateDefinition => ({
    control: {
      'type': 'image',
      'size': ['100%', '100%'],
      'anchor_from': 'center',
      'anchor_to': 'center',
      'keep_ratio': false,
      '$face_texture|default': 'textures/ui/unstyled',
      'texture': '$face_texture',
    },
  }),
} satisfies TemplateModule;
