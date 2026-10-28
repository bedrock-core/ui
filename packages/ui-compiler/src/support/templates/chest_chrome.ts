import type { TemplateControl, TemplateDefinition, TemplateModule } from '../types';

/** Cursor artwork rises independently of the buttons that forward pointer input to slots. */
const cursorVisual = (reference: string): TemplateControl => ({
  type: 'panel',
  size: ['100%', '100%'],
  layer: '$cursor_visual_layer',
  controls: [{ ['visual@' + reference]: {} }],
});

export default {
  'core_ui_chest.chrome': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      '$cursor_visual_layer|default': 0,
      'size': [
        '100%',
        '100%',
      ],
      'controls': [
        {
          ['routes@' + ref('core_ui_chest.key_routes')]: {},
        },
        {
          ['take_progress@' + ref('core_ui_chest.take_progress_button')]: {},
        },
        {
          ['selected_icon@' + ref('core_ui_chest.selected_icon_button')]: {},
        },
        {
          ['gamepad_cursor@' + ref('core_ui_chest.gamepad_cursor_button')]: {},
        },
      ],
    },
  }),
  'core_ui_chest.key_routes': (): TemplateDefinition => ({
    control: {
      type: 'input_panel',
      size: [
        0,
        0,
      ],
      button_mappings: [
        {
          from_button_id: 'button.return',
          to_button_id: 'button.return',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.arrow_up',
          to_button_id: 'button.arrow_key',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.arrow_down',
          to_button_id: 'button.arrow_key',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.arrow_left',
          to_button_id: 'button.arrow_key',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.arrow_right',
          to_button_id: 'button.arrow_key',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.turn_up',
          to_button_id: 'button.scroll_up',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.turn_down',
          to_button_id: 'button.scroll_down',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.turn_left',
          to_button_id: 'button.scroll_left',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.turn_right',
          to_button_id: 'button.scroll_right',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.inventory_left',
          to_button_id: 'button.inventory_left',
          mapping_type: 'global',
        },
        {
          from_button_id: 'button.inventory_right',
          to_button_id: 'button.inventory_right',
          mapping_type: 'global',
        },
      ],
    },
  }),
  'core_ui_chest.hold_icon': (): TemplateDefinition => ({
    control: {
      type: 'custom',
      renderer: 'progress_bar_renderer',
      variables: [
        {
          requires: '$desktop_screen',
          $bar_offset: [
            0,
            -12,
          ],
        },
        {
          requires: '$pocket_screen',
          $bar_offset: [
            0,
            -18,
          ],
        },
      ],
      layer: 70,
      offset: '$bar_offset',
      size: [
        15,
        3,
      ],
      bindings: [
        {
          binding_name: '#progress_bar_visible',
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
  }),
  'core_ui_chest.take_progress_button': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'button',
      locked_control: '',
      default_control: 'default',
      hover_control: 'hover',
      pressed_control: 'pressed',
      layer: -10,
      follows_cursor: true,
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
      always_handle_pointer: true,
      controls: ['default', 'pressed', 'hover'].map(state => ({
        [state]: cursorVisual(ref('core_ui_chest.hold_icon')),
      })),
    },
  }),
  'core_ui_chest.selected_icon': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_chest.item_renderer'),
    control: {
      layer: 50,
      size: [
        21,
        21,
      ],
      offset: [
        -1,
        -2,
      ],
      bindings: [
        {
          binding_name: '#inventory_selected_item',
          binding_name_override: '#item_id_aux',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_item_charged_item',
          binding_name_override: '#charged_item',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_item_color',
          binding_name_override: '#item_custom_color',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_armor_trim_material',
          binding_name_override: '#armor_trim_material',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_banner_patterns',
          binding_name_override: '#banner_patterns',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#shield_base_color_hovered',
          binding_name_override: '#shield_base_color',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_banner_colors',
          binding_name_override: '#banner_colors',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_banner_type',
          binding_name_override: '#banner_type',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_decorated_pot_sherds',
          binding_name_override: '#decorated_pot_sherds',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#inventory_selected_serialized_actor_pose',
          binding_name_override: '#serialized_actor_pose',
          binding_condition: 'always_when_visible',
        },
      ],
    },
  }),
  'core_ui_chest.selected_stack_size_text': (): TemplateDefinition => ({
    control: {
      type: 'label',
      offset: [
        -1,
        0,
      ],
      anchor_to: 'bottom_right',
      anchor_from: 'bottom_right',
      layer: 53,
      shadow: true,
      color: '$selected_item_stack_count_color',
      text: '#inventory_selected_item_stack_count',
      bindings: [
        {
          binding_name: '#inventory_selected_item_stack_count',
          binding_condition: 'always_when_visible',
        },
      ],
    },
  }),
  'core_ui_chest.selected_durability_bar': ({ ref }): TemplateDefinition => ({
    base: ref('core_ui_chest.durability_bar'),
    control: {
      $durability_bar_required: true,
      layer: 61,
      offset: [
        '-5%',
        5,
      ],
      size: [
        '100%',
        1,
      ],
      bindings: [
        {
          binding_name: '#selected_item_durability_visible',
          binding_name_override: '#touch_progress_bar_visible',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#selected_item_durability_total_amount',
          binding_name_override: '#progress_bar_total_amount',
          binding_condition: 'always_when_visible',
        },
        {
          binding_name: '#selected_item_durability_current_amount',
          binding_name_override: '#progress_bar_current_amount',
          binding_condition: 'always_when_visible',
        },
      ],
    },
  }),
  'core_ui_chest.selected_icon_panel': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      layer: '$cursor_visual_layer',
      controls: [
        {
          ['selected_item_icon@' + ref('core_ui_chest.selected_icon')]: {},
        },
        {
          ['selected_stack_size_text@' + ref('core_ui_chest.selected_stack_size_text')]: {},
        },
        {
          ['hover_text@' + ref('core_ui_chest.hover_text')]: {
            layer: 59,
            bindings: [
              {
                binding_name: '#using_touch',
                binding_name_override: '#visible',
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_chest.selected_icon_button': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'button',
      'anchor_from': 'center',
      'anchor_to': 'center',
      'locked_control': '',
      'default_control': 'default',
      'hover_control': 'hover',
      'pressed_control': 'pressed',
      'layer': -10,
      'size': [
        16,
        16,
      ],
      'follows_cursor': true,
      'sound_name': 'random.click',
      'sound_volume': 1,
      'sound_pitch': 1,
      'always_handle_pointer': true,
      '$durability_bar_required|default': true,
      'controls': [
        {
          ['default@' + ref('core_ui_chest.selected_icon_panel')]: {},
        },
        {
          ['pressed@' + ref('core_ui_chest.selected_icon_panel')]: {},
        },
        {
          ['hover@' + ref('core_ui_chest.selected_icon_panel')]: {},
        },
        {
          durability_bar_grabbed: cursorVisual(ref('core_ui_chest.selected_durability_bar')),
        },
      ],
    },
  }),
  'core_ui_chest.cursor_image': (): TemplateDefinition => ({
    control: {
      type: 'image',
      texture: 'textures/ui/pointer',
      size: [
        14,
        14,
      ],
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
  'core_ui_chest.gamepad_cursor_button': ({ ref }): TemplateDefinition => ({
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
      size: [
        16,
        16,
      ],
      follows_cursor: true,
      always_handle_pointer: true,
      controls: ['default', 'pressed', 'hover'].map(state => ({
        [state]: cursorVisual(ref('core_ui_chest.cursor_image')),
      })),
    },
  }),
} satisfies TemplateModule;
