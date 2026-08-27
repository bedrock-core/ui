/**
 * The JSON UI shapes this compiler emits.
 *
 * Mojang publishes a `UiElement` type in `@minecraft/bedrock-schemas`
 * (`types/rp/ui`), but it is a partial: the enums are declared with no members,
 * and six properties vanilla relies on are missing entirely. Rather than depend
 * on a type that cannot describe our own output, the emitter declares the subset
 * it actually writes, and marks which half of it Mojang documents.
 *
 * See `packages/resource-pack/SPEC-JSONUI.md` for the full audit and the list to
 * re-check on each schema bump.
 */

/** Documented by Mojang. Values come from `forms/ui/ui_element.form.json`. */
export type ControlType
  = | 'panel'
    | 'stack_panel'
    | 'image'
    | 'label'
    | 'button'
    | 'toggle'
    | 'slider'
    | 'slider_box'
    | 'edit_box'
    | 'grid'
    | 'scroll_view'
    | 'scrollbar_box'
    | 'dropdown'
    | 'input_panel'
    | 'screen'
    | 'custom';

/** Documented by Mojang. */
export type Anchor
  = | 'top_left'
    | 'top_middle'
    | 'top_right'
    | 'left_middle'
    | 'center'
    | 'right_middle'
    | 'bottom_left'
    | 'bottom_middle'
    | 'bottom_right';

/** Documented by Mojang. */
export type BindingType = 'global' | 'collection' | 'collection_details' | 'view' | 'none';

/** Documented by Mojang. */
export type BindingCondition
  = | 'always'
    | 'visible'
    | 'once'
    | 'always_when_visible'
    | 'visibility_changed';

/** Documented by Mojang. `small` is the base the form render pack scales from. */
export type FontSize = 'small' | 'normal' | 'large' | 'extra_large';

/** A size or offset component: pixels, or a string form such as `"100%"`. */
export type Measure = number | string;

/**
 * One input route. `from_button_id` may be absent: vanilla's slot prototype
 * ends with self-routed entries (`shape_drawing`, `container_slot_hovered`)
 * that name only a target.
 */
export interface ButtonMapping {
  from_button_id?: string;
  to_button_id: string;
  mapping_type: 'global' | 'pressed' | 'double_pressed' | 'focused';
  /** Undocumented by Mojang. An expression; the mapping is dropped when true. */
  ignored?: string;
}

export interface Binding {
  binding_type?: BindingType;
  binding_name?: string;
  binding_name_override?: string;
  binding_collection_name?: string;
  binding_condition?: BindingCondition;
  /** Undocumented by Mojang. Reads a property off a sibling control by name. */
  source_control_name?: string;
  resolve_sibling_scope?: boolean;
  source_property_name?: string;
  target_property_name?: string;
}

/**
 * One control. Inline children are `{ name: Control }`; references to another
 * definition are `{ 'name@namespace.def': Control }` — the same map either way,
 * which is why `controls` is a list of single-entry records.
 */
export interface Control {
  type?: ControlType;
  /** Drops the control at load time when the expression holds, e.g. `(not $desktop_screen)`. */
  ignored?: string | boolean;
  /** Conditional variable sets, each applied when its `requires` expression holds. */
  variables?: Record<string, unknown>[];
  close_on_player_hurt?: string | boolean;
  use_custom_pocket_toast?: string | boolean;
  size?: [Measure, Measure];
  offset?: [Measure, Measure];
  anchor_from?: Anchor;
  anchor_to?: Anchor;
  layer?: number;
  /** Documented. Emitted only as `false`: a control is visible unless hidden. */
  visible?: boolean;
  orientation?: 'horizontal' | 'vertical';
  controls?: ControlEntry[];
  bindings?: Binding[];

  /* label */
  text?: string;
  color?: [number, number, number];
  shadow?: boolean;
  /** Undocumented by Mojang. Labels localize by default; literals need this off. */
  localize?: boolean;
  /** Documented. A font alias such as `default` or `MinecraftTen`. */
  font_type?: string;
  font_size?: FontSize;
  /** Documented. Multiplies `font_size`; the form render pack draws every label this way. */
  font_scale_factor?: number;

  /* image */
  texture?: string;
  /** Documented. Images preserve their texture's aspect ratio unless this is off. */
  keep_ratio?: boolean;

  /* custom renderers */
  /** Documented. Which engine renderer a `custom` control draws with. */
  renderer?: string;
  /** Documented. Initial values of the properties a renderer reads. */
  property_bag?: Record<string, unknown>;

  /* collections */
  collection_name?: string;
  /**
   * Undocumented by Mojang. Accepted ONLY on a direct child of a control that
   * declares `collection_name`; anywhere else the engine rejects it outright.
   */
  collection_index?: number | string;
  /** Documented. Columns and rows of a `grid`. */
  grid_dimensions?: [number, number];
  /** Documented. The definition a `grid` instantiates per cell. */
  grid_item_template?: string;

  /* buttons */
  /**
   * Documented. Name of the child drawn while the pointer is over the button,
   * and while it is held. A container slot IS a button, which is what lets a
   * compiled screen give one real hover and pressed states without the item
   * behind it being visible at all.
   */
  hover_control?: string;
  pressed_control?: string;
  default_control?: string;
  /** Documented. A control with this off takes no focus, so it cannot be interacted with. */
  focus_enabled?: boolean;
  /** Documented. The sound a button plays when pressed. */
  sound_name?: string;
  sound_volume?: number;
  sound_pitch?: number;
  /**
   * Documented. Routes input on this control to engine actions. A derived
   * control's array REPLACES its base's, which is what lets a button slot swap
   * vanilla's take-to-cursor for auto-place wholesale.
   */
  button_mappings?: ButtonMapping[];

  /* custom renderers */
  /** Undocumented by Mojang. The paper doll faces the pointer unless this spins it. */
  rotation?: 'auto';
  /** Undocumented. The paper doll draws the equipped skin when false. */
  use_selected_skin?: boolean;

  /** Pack-defined variables. Legal in ordinary properties, never in a binding. */
  [variable: `$${string}`]: unknown;
}

export type ControlEntry = Record<string, Control>;

/**
 * One edit to a definition another file owns. Documented by Mojang: a file
 * naming an existing definition with `modifications` instead of a body edits
 * it in place, and edits from several files stack — which is how packs built
 * apart can all add to the same definition.
 */
export interface Modification {
  array_name: 'controls' | 'bindings' | 'button_mappings' | 'variables';
  operation: 'insert_front' | 'insert_back' | 'insert_after' | 'insert_before' | 'remove';
  value?: ControlEntry[] | Binding[] | ButtonMapping[];
  control_name?: string;
}

export interface Modified {
  modifications: Modification[];
}

export interface Document {
  namespace: string;
  [definition: string]: Control | Modified | string;
}
