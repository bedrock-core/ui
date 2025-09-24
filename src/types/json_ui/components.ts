import type {
  ControlProperties,
  LayoutProperties,
  DataBindingProperties,
  InputProperties,
  FocusProperties,
  SoundProperties,
  TextProperties,
  SpriteProperties,
  ButtonProperties,
  ToggleProperties,
  SliderProperties,
  TextEditProperties,
  StackPanelProperties,
  CollectionProperties,
  GridProperties,
  DropdownProperties,
  ScrollViewProperties
} from './properties.js';

/**
 * JSON UI Component Interfaces
 * Based on documented JSON UI properties from
 * {@link https://wiki.bedrock.dev/json-ui/json-ui-documentation}
 */

export interface PanelComponent extends ControlProperties, LayoutProperties, DataBindingProperties { type: 'panel' }

export interface StackPanelComponent extends ControlProperties, LayoutProperties, DataBindingProperties, StackPanelProperties, CollectionProperties { type: 'stack_panel' }

export interface CollectionPanelComponent extends ControlProperties, LayoutProperties, DataBindingProperties, CollectionProperties { type: 'collection_panel' }

export interface GridComponent extends ControlProperties, LayoutProperties, DataBindingProperties, GridProperties, CollectionProperties { type: 'grid' }

export interface LabelComponent extends ControlProperties, LayoutProperties, DataBindingProperties, TextProperties { type: 'label' }

export interface ImageComponent extends ControlProperties, LayoutProperties, DataBindingProperties, SpriteProperties { type: 'image' }

export interface InputPanelComponent extends ControlProperties, LayoutProperties, DataBindingProperties, InputProperties, FocusProperties, SoundProperties { type: 'input_panel' }

export interface ButtonComponent extends ControlProperties, LayoutProperties, DataBindingProperties, ButtonProperties, InputProperties, FocusProperties, SoundProperties { type: 'button' }

export interface ToggleComponent extends ControlProperties, LayoutProperties, DataBindingProperties, ToggleProperties, InputProperties, FocusProperties, SoundProperties { type: 'toggle' }

export interface DropdownComponent extends ControlProperties, LayoutProperties, DataBindingProperties, DropdownProperties, ToggleProperties, InputProperties, FocusProperties, SoundProperties { type: 'dropdown' }

export interface SliderComponent extends ControlProperties, LayoutProperties, DataBindingProperties, SliderProperties, InputProperties, FocusProperties, SoundProperties { type: 'slider' }

export interface EditBoxComponent extends ControlProperties, LayoutProperties, DataBindingProperties, TextEditProperties, ButtonProperties, InputProperties, FocusProperties { type: 'edit_box' }

export interface ScrollViewComponent extends ControlProperties, LayoutProperties, DataBindingProperties, ScrollViewProperties, InputProperties { type: 'scroll_view' }

export type Component =
  | PanelComponent
  | StackPanelComponent
  | CollectionPanelComponent
  | GridComponent
  | LabelComponent
  | ImageComponent
  | InputPanelComponent
  | ButtonComponent
  | ToggleComponent
  | DropdownComponent
  | SliderComponent
  | EditBoxComponent
  | ScrollViewComponent;

export type ComponentTypeUnion =
  | 'panel'
  | 'stack_panel'
  | 'collection_panel'
  | 'grid'
  | 'label'
  | 'image'
  | 'input_panel'
  | 'button'
  | 'toggle'
  | 'dropdown'
  | 'slider'
  | 'edit_box'
  | 'scroll_view';
