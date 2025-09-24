import {
  ButtonProperties,
  ControlProperties,
  DropdownProperties,
  GridProperties,
  InputProperties,
  LayoutProperties,
  ScrollViewProperties,
  SliderProperties,
  SpriteProperties,
  StackPanelProperties,
  TextEditProperties,
  TextProperties,
  ToggleProperties
} from './properties.js';

/**
 * JSON UI Component Interfaces
 * This is for reference and type safety when building JSON UI structures programmatically.
 * Should not be used in the codebase directly.
 * Based on documented JSON UI properties from
 * {@link https://wiki.bedrock.dev/json-ui/json-ui-documentation}
 */

interface PanelComponent extends ControlProperties, LayoutProperties { type: 'panel' }

interface StackPanelComponent extends ControlProperties, LayoutProperties, StackPanelProperties { type: 'stack_panel' }

interface CollectionPanelComponent extends ControlProperties, LayoutProperties { type: 'collection_panel' }

interface GridComponent extends ControlProperties, LayoutProperties, GridProperties { type: 'grid' }

interface LabelComponent extends ControlProperties, LayoutProperties, TextProperties { type: 'label' }

interface ImageComponent extends ControlProperties, LayoutProperties, SpriteProperties { type: 'image' }

interface InputPanelComponent extends ControlProperties, LayoutProperties, InputProperties { type: 'input_panel' }

interface ButtonComponent extends ControlProperties, LayoutProperties, ButtonProperties, InputProperties { type: 'button' }

interface ToggleComponent extends ControlProperties, LayoutProperties, ToggleProperties, InputProperties { type: 'toggle' }

interface DropdownComponent extends ControlProperties, LayoutProperties, DropdownProperties, ToggleProperties, InputProperties { type: 'dropdown' }

interface SliderComponent extends ControlProperties, LayoutProperties, SliderProperties, InputProperties { type: 'slider' }

interface EditBoxComponent extends ControlProperties, LayoutProperties, TextEditProperties, ButtonProperties, InputProperties { type: 'edit_box' }

interface ScrollViewComponent extends ControlProperties, LayoutProperties, ScrollViewProperties, InputProperties { type: 'scroll_view' }

export type JSONComponent =
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

export type JSONComponentTypeUnion =
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
