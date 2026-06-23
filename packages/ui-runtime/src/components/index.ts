// Component utilities
export { withControl, type ControlProps } from './control';
export { type ModalFieldProps } from './modalField';

export {
  type AlignContent, type AlignItems, type AlignSelf,
  type Display, type FlexDirection, type FlexSize,
  type FlexWrap, type JustifyContent, type LayoutProps, type Position,
  type Spacing,
} from './layout';

// Components
export { Button, buttonWriter, type ButtonProps } from './Button';
export { Dropdown, type DropdownProps } from './Dropdown';
export { Fragment, type FragmentProps } from './Fragment';
export { Image, imageWriter, type ImageProps } from './Image';
export { Input, type InputProps } from './Input';
export { Slider, type SliderProps } from './Slider';
export { ItemRenderer, itemRendererWriter, type ItemRendererProps } from './ItemRenderer';
export { Panel, panelWriter, type PanelProps } from './Panel';
export { Scroll, type ScrollProps } from './Scroll';
export { Text, textWriter, type TextFont, type TextOverflow, type TextProps, type TextStyle, type TextWordBreak } from './Text';

import { registerComponent } from '../core/componentRegistry';
import { buttonWriter } from './Button';
import { imageWriter } from './Image';
import { itemRendererWriter } from './ItemRenderer';
import { panelWriter } from './Panel';
import { textWriter } from './Text';

let registered = false;

/**
 * Registers the built-in native component types into the component registry.
 *
 * Idempotent and called from `render()` — the built-ins are guaranteed present
 * before the first serialize/layout pass.
 */
export function registerNativeComponents(): void {
  if (registered) {
    return;
  }

  registered = true;

  registerComponent('button', { writer: buttonWriter });
  registerComponent('panel', { writer: panelWriter });
  registerComponent('text', { writer: textWriter });
  registerComponent('image', { writer: imageWriter });
  registerComponent('item_renderer', { writer: itemRendererWriter });
  registerComponent('fragment', { transparent: true });
  registerComponent('context-provider', { transparent: true });
  // Scroll wrapper: emits no payload; the layout pass treats each as an independent
  // layout root (its own viewport) and tags its descendants with its scroll index.
  registerComponent('scroll-slot', { transparent: true });
}
