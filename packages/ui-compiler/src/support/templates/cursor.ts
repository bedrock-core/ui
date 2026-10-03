import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_common.gamepad_cursor_image': (): TemplateDefinition => ({
    control: {
      type: 'image',
      texture: 'textures/ui/pointer',
      size: [14, 14],
      layer: 60,
      follows_cursor: true,
      property_bag: {
        '#visible': false,
      },
      visible: '#visible',
      bindings: [
        {
          binding_name: '#gamepad_cursor_visible',
          binding_name_override: '#visible',
          binding_condition: 'always',
        },
      ],
    },
  }),
  'core_ui_common.gamepad_cursor_button': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'button',
      visible: false,
      anchor_from: 'center',
      anchor_to: 'center',
      locked_control: '',
      default_control: 'default',
      hover_control: 'hover',
      pressed_control: 'pressed',
      layer: -10,
      size: [16, 16],
      follows_cursor: true,
      always_handle_pointer: true,
      controls: ['default', 'pressed', 'hover'].map(state => ({
        [`${state}@${ref('core_ui_common.gamepad_cursor_image')}`]: {},
      })),
    },
  }),
} satisfies TemplateModule;
