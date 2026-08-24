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

/** NOT documented by Mojang; taken from vanilla. */
export type ClipDirection = 'left' | 'right' | 'up' | 'down' | 'center';

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
  size?: [Measure, Measure];
  offset?: [Measure, Measure];
  anchor_from?: Anchor;
  anchor_to?: Anchor;
  layer?: number;
  orientation?: 'horizontal' | 'vertical';
  controls?: ControlEntry[];
  bindings?: Binding[];

  /* label */
  text?: string;
  color?: [number, number, number];
  shadow?: boolean;
  /** Undocumented by Mojang. Labels localize by default; literals need this off. */
  localize?: boolean;

  /* image */
  texture?: string;
  /** Documented. Images preserve their texture's aspect ratio unless this is off. */
  keep_ratio?: boolean;
  /** Undocumented by Mojang, and the only way to draw a bar. */
  clip_direction?: ClipDirection;
  clip_pixelperfect?: boolean;

  /* collections */
  collection_name?: string;
  /**
   * Undocumented by Mojang. Accepted ONLY on a direct child of a control that
   * declares `collection_name`; anywhere else the engine rejects it outright.
   */
  collection_index?: number | string;

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
  /**
   * Documented. Routes input on this control to engine actions. A derived
   * control's array REPLACES its base's, which is what lets a button slot swap
   * vanilla's take-to-cursor for auto-place wholesale.
   */
  button_mappings?: ButtonMapping[];

  /** Pack-defined variables. Legal in ordinary properties, never in a binding. */
  [variable: `$${string}`]: unknown;
}

export type ControlEntry = Record<string, Control>;

export interface Document {
  namespace: string;
  [definition: string]: Control | string;
}
