import { UNSTYLED_TEXTURE } from '@bedrock-core/ui-runtime/compile';
import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_form_components.slider_live': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: ['100%', '100%'],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      controls: [
        {
          ['body@' + ref('core_ui_form_components.slider_body')]: {},
        },
      ],
    },
  }),
  'core_ui_form_components.slider_value': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: ['100%', '100%'],
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      controls: [
        {
          ['shown@' + ref('core_ui_form_components.slider_value_label')]: {},
        },
      ],
    },
  }),
  'core_ui_form_components.slider_value_label': (): TemplateDefinition => ({
    control: {
      type: 'label',
      font_size: 'small',
      font_scale_factor: 2,
      color: [1, 1, 1, 1],
      text_alignment: 'right',
      size: ['default', 'default'],
      offset: [0, 0],
      anchor_from: 'top_right',
      anchor_to: 'top_right',
      // The thumb's nested layers total 8; values remain readable across its travel.
      layer: 9,
      localize: false,
      text: '#shown',
      property_bag: {
        '#raw': '',
        '#joined': '',
        '#shown': '',
      },
      bindings: [
        {
          binding_name: '#custom_slider_text',
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
          binding_name_override: '#raw',
        },
        {
          binding_type: 'view',
          source_property_name: '(\'§r\' + (#raw - (\'%.175s\' * #raw)))',
          target_property_name: '#joined',
        },
        {
          binding_type: 'view',
          source_property_name: '(#joined - \': \')',
          target_property_name: '#shown',
        },
      ],
    },
  }),
  'core_ui_form_components.slider_body': ({ ref }): TemplateDefinition => ({
    control: {
      'type': 'panel',
      '$travel_size|default': ['100% - 16px', 16],
      '$bar_size|default': ['100%', 10],
      '$thumb_size|default': [16, 16],
      ...Object.fromEntries(['track', 'track_hover', 'progress', 'progress_hover', 'thumb', 'thumb_hover', 'thumb_pressed', 'thumb_locked']
        .map(name => [`$${name}|default`, UNSTYLED_TEXTURE])),
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'controls': [
        {
          ['value@' + ref('core_ui_form_components.slider_value')]: {},
        },
        {
          travel: {
            type: 'panel',
            size: '$travel_size',
            anchor_from: 'center',
            anchor_to: 'center',
            controls: [
              {
                ['slider@' + ref('core_ui_form_components.slider_control')]: {
                  $bar_size: '$bar_size',
                  $thumb_size: '$thumb_size',
                  $track: '$track',
                  $track_hover: '$track_hover',
                  $progress: '$progress',
                  $progress_hover: '$progress_hover',
                  $thumb: '$thumb',
                  $thumb_hover: '$thumb_hover',
                  $thumb_pressed: '$thumb_pressed',
                  $thumb_locked: '$thumb_locked',
                },
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_form_components.slider_control': (): TemplateDefinition => ({
    control: {
      'type': 'slider',
      'size': ['100%', '100%'],
      'anchor_from': 'top_left',
      'anchor_to': 'top_left',
      'layer': 2,
      '$field_enabled|default': '#enabled',
      'enabled': '$field_enabled',
      '$track|default': '#texture',
      '$track_hover|default': '#texture',
      '$progress|default': '#texture',
      '$progress_hover|default': '#texture',
      '$thumb|default': '#texture',
      '$thumb_hover|default': '#texture',
      '$thumb_pressed|default': '#texture',
      '$thumb_locked|default': '#texture',
      '$bar_size|default': [1, 0],
      '$thumb_size|default': [1, 0],
      'slider_name': 'custom_slider',
      'slider_track_button': 'custom_slider',
      '$slider_direction|default': 'horizontal',
      'slider_direction': '$slider_direction',
      'slider_collection_name': 'custom_form',
      'slider_box_control': 'slider_box',
      'default_control': 'bar_default_anchor',
      'hover_control': 'bar_hover_anchor',
      'background_control': 'slider_background',
      'background_hover_control': 'slider_background_hover',
      'progress_control': 'slider_progress',
      'progress_hover_control': 'slider_progress_hover',
      'slider_small_decrease_button': 'slider.small_decrease',
      'slider_small_increase_button': 'slider.small_increase',
      'slider_selected_button': 'slider.selected',
      'slider_deselected_button': 'slider.deselected',
      'always_listen_to_input': false,
      'always_handle_pointer': true,
      'focus_enabled': true,
      'default_focus_precedence': 0,
      'property_bag': {
        '#slider_steps': 1,
        '#slider_value': 0,
      },
      'button_mappings': [
        {
          from_button_id: 'button.menu_select',
          to_button_id: 'custom_slider',
          mapping_type: 'pressed',
          button_up_right_of_first_refusal: true,
        },
        {
          from_button_id: 'button.menu_ok',
          to_button_id: 'slider.selected',
          mapping_type: 'focused',
        },
        {
          from_button_id: 'button.menu_cancel',
          to_button_id: 'slider.deselected',
          mapping_type: 'focused',
        },
        {
          ignored: '($slider_direction = \'vertical\')',
          from_button_id: 'button.menu_left',
          to_button_id: 'slider.small_decrease',
          mapping_type: 'pressed',
          ignore_input_scope: true,
        },
        {
          ignored: '($slider_direction = \'horizontal\')',
          from_button_id: 'button.menu_up',
          to_button_id: 'slider.small_decrease',
          mapping_type: 'pressed',
          ignore_input_scope: true,
        },
        {
          ignored: '($slider_direction = \'vertical\')',
          from_button_id: 'button.menu_right',
          to_button_id: 'slider.small_increase',
          mapping_type: 'pressed',
          ignore_input_scope: true,
        },
        {
          ignored: '($slider_direction = \'horizontal\')',
          from_button_id: 'button.menu_down',
          to_button_id: 'slider.small_increase',
          mapping_type: 'pressed',
          ignore_input_scope: true,
        },
      ],
      'bindings': [
        {
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
          binding_name: '#custom_slider_steps',
          binding_name_override: '#slider_steps',
        },
        {
          binding_type: 'collection',
          binding_collection_name: 'custom_form',
          binding_name: '#custom_slider_value',
          binding_name_override: '#slider_value',
        },
      ],
      'controls': [
        {
          bar_default_anchor: {
            type: 'panel',
            size: ['100%', '100%'],
            anchor_from: 'center',
            anchor_to: 'center',
            controls: [
              {
                bar_default_size: {
                  type: 'panel',
                  size: '$bar_size',
                  anchor_from: 'center',
                  anchor_to: 'center',
                  controls: [
                    {
                      bar_default: {
                        type: 'image',
                        keep_ratio: false,
                        fill: true,
                        size: ['100%', '100%'],
                        layer: 1,
                        texture: '$track',
                        controls: [
                          {
                            sizing_panel: {
                              type: 'panel',
                              size: ['100%', '100%'],
                              anchor_from: 'center',
                              anchor_to: 'center',
                              controls: [
                                {
                                  slider_background: {
                                    type: 'image',
                                    keep_ratio: false,
                                    fill: true,
                                    size: ['100%', '100%'],
                                    layer: 1,
                                    texture: '$track',
                                  },
                                },
                                {
                                  slider_progress: {
                                    type: 'image',
                                    keep_ratio: false,
                                    fill: true,
                                    size: ['100%', '100%'],
                                    layer: 3,
                                    texture: '$progress',
                                    clip_direction: 'left',
                                    clip_pixelperfect: false,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          bar_hover_anchor: {
            type: 'panel',
            size: ['100%', '100%'],
            anchor_from: 'center',
            anchor_to: 'center',
            visible: false,
            controls: [
              {
                bar_hover_size: {
                  type: 'panel',
                  size: '$bar_size',
                  anchor_from: 'center',
                  anchor_to: 'center',
                  controls: [
                    {
                      bar_hover: {
                        type: 'image',
                        keep_ratio: false,
                        fill: true,
                        size: ['100%', '100%'],
                        layer: 1,
                        texture: '$track_hover',
                        controls: [
                          {
                            sizing_panel: {
                              type: 'panel',
                              size: ['100%', '100%'],
                              anchor_from: 'center',
                              anchor_to: 'center',
                              controls: [
                                {
                                  slider_background_hover: {
                                    type: 'image',
                                    keep_ratio: false,
                                    fill: true,
                                    size: ['100%', '100%'],
                                    layer: 1,
                                    texture: '$track_hover',
                                  },
                                },
                                {
                                  slider_progress_hover: {
                                    type: 'image',
                                    keep_ratio: false,
                                    fill: true,
                                    size: ['100%', '100%'],
                                    layer: 3,
                                    texture: '$progress_hover',
                                    clip_direction: 'left',
                                    clip_pixelperfect: false,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          slider_box: {
            type: 'slider_box',
            size: [16, 16],
            anchor_from: 'center',
            anchor_to: 'center',
            layer: 4,
            default_control: 'default',
            hover_control: 'hover',
            locked_control: 'locked',
            indent_control: 'indent',
            controls: [
              {
                thumb_anchor: {
                  type: 'panel',
                  size: [1, 1],
                  anchor_from: 'center',
                  anchor_to: 'center',
                  controls: [
                    {
                      thumb_size: {
                        type: 'panel',
                        size: '$thumb_size',
                        anchor_from: 'center',
                        anchor_to: 'center',
                        controls: [
                          {
                            default: {
                              type: 'image',
                              keep_ratio: false,
                              fill: true,
                              size: ['100%', '100%'],
                              layer: 2,
                              texture: '$thumb',
                            },
                          },
                          {
                            hover: {
                              type: 'image',
                              keep_ratio: false,
                              fill: true,
                              size: ['100%', '100%'],
                              layer: 2,
                              texture: '$thumb_hover',
                            },
                          },
                          {
                            locked: {
                              type: 'image',
                              keep_ratio: false,
                              fill: true,
                              size: ['100%', '100%'],
                              layer: 2,
                              texture: '$thumb_locked',
                            },
                          },
                          {
                            indent: {
                              type: 'image',
                              keep_ratio: false,
                              fill: true,
                              size: ['100%', '100%'],
                              layer: 2,
                              texture: '$thumb_pressed',
                            },
                          },
                        ],
                      },
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
} satisfies TemplateModule;
