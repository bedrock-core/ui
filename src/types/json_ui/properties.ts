/**
 * JSON UI Property Group Interfaces
 * Based on documented JSON UI properties from
 * {@link https://wiki.bedrock.dev/json-ui/json-ui-documentation}
 */

export type AnchorPosition =
  | 'top_left' | 'top_middle' | 'top_right'
  | 'left_middle' | 'center' | 'right_middle'
  | 'bottom_left' | 'bottom_middle' | 'bottom_right';

export interface DataBinding {
  binding_name?: string;
  binding_name_override?: string;
  binding_type?: 'global' | 'view' | 'collection' | 'collection_details' | 'none';
  binding_collection_name?: string;
  binding_condition?: 'always' | 'always_when_visible' | 'visible' | 'once' | 'none';
  source_control_name?: string;
  source_property_name?: string;
  target_property_name?: string;
}

export interface ButtonMapping {
  from_button_id: string;
  to_button_id: string;
  mapping_type?: 'global' | 'pressed' | 'double_pressed' | 'focused';
  scope?: 'view' | 'controller';
}

export interface SoundDefinition {
  sound_name: string;
  sound_volume?: number;
  sound_pitch?: number;
  min_seconds_between_plays?: number;
}

// TODO find actual types for any if there is ever need for this
// @eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ControlProperties {
  visible?: boolean;
  enabled?: boolean;
  layer?: number;
  alpha?: number;
  propagate_alpha?: boolean;
  clips_children?: boolean;
  allow_clipping?: boolean;
  clip_offset?: [number, number];
  clip_state_change_event?: string;
  enable_scissor_test?: boolean;
  property_bag?: Record<string, any>;
  selected?: boolean;
  use_child_anchors?: boolean;
  controls?: any[];
  anims?: string[];
  disable_anim_fast_forward?: boolean;
  animation_reset_name?: string;
  ignored?: boolean;
  variables?: any[] | Record<string, any>;
  modifications?: any[];
  grid_position?: [number, number];
  collection_index?: number;
}

export interface LayoutProperties {
  size?: [number | string, number | string];
  max_size?: [number | string, number | string];
  min_size?: [number | string, number | string];
  offset?: [number | string, number | string];
  anchor_from?: AnchorPosition;
  anchor_to?: AnchorPosition;
  inherit_max_sibling_width?: boolean;
  inherit_max_sibling_height?: boolean;
  contained?: boolean;
  draggable?: 'vertical' | 'horizontal' | 'both';
  follows_cursor?: boolean;
}

export interface DataBindingProperties { bindings?: DataBinding[] }

export interface InputProperties {
  button_mappings?: ButtonMapping[];
  modal?: boolean;
  always_listen_to_input?: boolean;
  hover_enabled?: boolean;
  consume_event?: boolean;
}

export interface FocusProperties {
  focus_enabled?: boolean;
  focus_identifier?: string;
  default_focus_precedence?: number;
  focus_change_down?: string;
  focus_change_up?: string;
  focus_change_left?: string;
  focus_change_right?: string;
}

export interface SoundProperties {
  sound_name?: string;
  sound_volume?: number;
  sound_pitch?: number;
  sounds?: SoundDefinition[];
}

export interface TextProperties {
  text?: string;
  color?: [number, number, number];
  locked_color?: [number, number, number];
  shadow?: boolean;
  font_size?: 'small' | 'normal' | 'large' | 'extra_large';
  font_scale_factor?: number;
  font_type?: string;
  localize?: boolean;
  text_alignment?: 'left' | 'center' | 'right' | 'justify';
}

export interface SpriteProperties {
  texture?: string;
  uv?: [number, number];
  uv_size?: [number, number];
  texture_file_system?: string;
  nineslice_size?: number | [number, number, number, number];
  tiled?: boolean | 'x' | 'y';
  keep_ratio?: boolean;
  bilinear?: boolean;
}

export interface ButtonProperties {
  default_control?: string;
  hover_control?: string;
  pressed_control?: string;
  locked_control?: string;
}

export interface ToggleProperties {
  toggle_name?: string;
  toggle_default_state?: boolean;
  toggle_group_forced_index?: number;
  checked_control?: string;
  unchecked_control?: string;
  checked_hover_control?: string;
  unchecked_hover_control?: string;
}

export interface SliderProperties {
  slider_name?: string;
  slider_steps?: number;
  slider_direction?: 'vertical' | 'horizontal';
  slider_box_control?: string;
  background_control?: string;
  progress_control?: string;
}

export interface TextEditProperties {
  text_box_name?: string;
  max_length?: number;
  text_type?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
  enabled_newline?: boolean;
  text_control?: string;
  place_holder_control?: string;
}

export interface StackPanelProperties { orientation?: 'vertical' | 'horizontal' }

export interface CollectionProperties {
  collection_name?: string;
  collection_index?: number;
}

export interface GridProperties {
  grid_dimensions?: [number, number];
  grid_dimension_binding?: string;
  grid_rescaling_type?: 'horizontal' | 'vertical' | 'none';
  maximum_grid_items?: number;
}

export interface DropdownProperties {
  dropdown_name?: string;
  dropdown_content_control?: string;
  dropdown_area?: string;
  dropdown_toggle_label?: string;
}

export interface ScrollViewProperties {
  scrollbar_track_button?: string;
  scrollbar_box?: string;
  scroll_speed?: number;
  gesture_tracking_button?: string;
  always_handle_pointer?: boolean;
  touch_mode?: boolean;
  scrollbar_touch_mode?: boolean;
  jump_to_bottom_on_update?: boolean;
  rendered_camera_viewport?: boolean;
  scroll_box_mouse_visibility_requires_focus?: boolean;
}
