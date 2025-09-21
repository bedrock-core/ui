import type { JSXElement } from '../types/jsx/types.js';
import { jsx } from './runtime.js';
import type {
  PanelComponent,
  StackPanelComponent,
  CollectionPanelComponent,
  GridComponent,
  ScrollViewComponent,
  ButtonComponent,
  ToggleComponent,
  DropdownComponent,
  SliderComponent,
  EditBoxComponent,
  InputPanelComponent,
  LabelComponent,
  ImageComponent,
} from '../types/json_ui/components.js';

/**
 * Component factory functions for programmatic UI creation
 * 
 * These functions provide a convenient way to create components without JSX.
 * They follow the pattern used by popular React libraries like Material-UI and Ant Design.
 */

// =============================================================================
// Container Components
// =============================================================================

export const Panel = (props: Partial<PanelComponent> = {}): JSXElement =>
  jsx('Panel', props);

export const StackPanel = (props: Partial<StackPanelComponent> = {}): JSXElement =>
  jsx('StackPanel', props);

export const CollectionPanel = (props: Partial<CollectionPanelComponent> = {}): JSXElement =>
  jsx('CollectionPanel', props);

export const Grid = (props: Partial<GridComponent> = {}): JSXElement =>
  jsx('Grid', props);

export const ScrollView = (props: Partial<ScrollViewComponent> = {}): JSXElement =>
  jsx('ScrollView', props);

// =============================================================================
// Interactive Components
// =============================================================================

export const Button = (props: Partial<ButtonComponent> = {}): JSXElement =>
  jsx('Button', props);

export const Toggle = (props: Partial<ToggleComponent> = {}): JSXElement =>
  jsx('Toggle', props);

export const Dropdown = (props: Partial<DropdownComponent> = {}): JSXElement =>
  jsx('Dropdown', props);

export const Slider = (props: Partial<SliderComponent> = {}): JSXElement =>
  jsx('Slider', props);

export const EditBox = (props: Partial<EditBoxComponent> = {}): JSXElement =>
  jsx('EditBox', props);

export const InputPanel = (props: Partial<InputPanelComponent> = {}): JSXElement =>
  jsx('InputPanel', props);

// =============================================================================
// Display Components
// =============================================================================

export const Label = (props: Partial<LabelComponent> = {}): JSXElement =>
  jsx('Label', props);

export const Image = (props: Partial<ImageComponent> = {}): JSXElement =>
  jsx('Image', props);


export const Components = {
  // Containers
  Panel,
  StackPanel,
  CollectionPanel,
  Grid,
  ScrollView,

  // Interactive
  Button,
  Toggle,
  Dropdown,
  Slider,
  EditBox,
  InputPanel,

  // Display
  Label,
  Image,
};