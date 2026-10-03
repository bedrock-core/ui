import type { TemplateDefinition, TemplateModule } from '../types';

export default {
  'core_ui_shapes.scroll': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'scroll_view',
      anchor_from: 'top_left',
      anchor_to: 'top_left',
      scroll_speed: 15,
      scrollbar_track_button: 'button.scrollbar_skip_track',
      scrollbar_touch_button: 'button.scrollbar_touch',
      always_listen_to_input: true,
      always_handle_pointer: true,
      always_handle_scrolling: false,
      allow_scroll_even_when_content_fits: false,
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
            type: 'input_panel',
            size: ['100% - 8px', '100%'],
            anchor_from: 'top_left',
            anchor_to: 'top_left',
            hover_enabled: true,
            clips_children: true,
            controls: [
              {
                'scrolling_content@$scrolling_content': {
                  layer: 1,
                  anchor_from: 'top_left',
                  anchor_to: 'top_left',
                },
              },
            ],
          },
        },
        {
          ['bar_and_track@' + ref('core_ui_shapes.scrollbar')]: {
            offset: [-3, 0],
          },
        },
      ],
    },
  }),
  'core_ui_shapes.scrollbar': ({ ref }): TemplateDefinition => ({
    control: {
      type: 'panel',
      size: [5, '100%'],
      anchor_from: 'right_middle',
      anchor_to: 'right_middle',
      controls: [
        {
          track: {
            type: 'scroll_track',
            size: [5, '100%'],
            anchor_from: 'center',
            anchor_to: 'center',
            button_mappings: [
              {
                from_button_id: 'button.menu_select',
                to_button_id: 'button.scrollbar_skip_track',
                mapping_type: 'pressed',
              },
            ],
            controls: [
              {
                ['bar_indent@' + ref('core_ui_shapes.scroll_rail')]: {
                  anchor_from: 'center',
                  anchor_to: 'center',
                },
              },
            ],
          },
        },
        {
          box: {
            type: 'scrollbar_box',
            size: [5, '20%'],
            anchor_from: 'top_middle',
            anchor_to: 'top_middle',
            draggable: 'vertical',
            contained: true,
            button_mappings: [
              {
                from_button_id: 'button.menu_select',
                to_button_id: 'button.menu_select',
                mapping_type: 'pressed',
                button_up_right_of_first_refusal: true,
              },
            ],
            controls: [
              {
                ['handle@' + ref('core_ui_shapes.scroll_handle')]: {
                  anchor_from: 'center',
                  anchor_to: 'center',
                },
              },
            ],
          },
        },
      ],
    },
  }),
  'core_ui_shapes.scroll_rail': (): TemplateDefinition => ({
    control: {
      type: 'image',
      texture: 'textures/ui/ScrollRail',
      size: [3, '100%'],
      layer: 3,
    },
  }),
  'core_ui_shapes.scroll_handle': (): TemplateDefinition => ({
    control: {
      type: 'image',
      texture: 'textures/ui/ScrollHandle',
      size: [5, '100%'],
      layer: 4,
    },
  }),
} satisfies TemplateModule;
