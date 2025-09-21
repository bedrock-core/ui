
/**
 * @bedrock-core/ui - Direct Component API
 * Revolutionary Minecraft Bedrock UI framework using text field data transmission
 * 
 * Create UI components directly without JSX - just call the component functions
 * 
 * @example
 * ```typescript
 * import { Panel, Button, Text, present } from '@bedrock-core/ui';
 * 
 * const ui = Panel({
 *   display: 'flex',
 *   orientation: 'vertical',
 *   children: [
 *     Text({ value: 'Hello World!' }),
 *     Button({ label: 'Click me' })
 *   ]
 * });
 * 
 * await present(player, ui);
 * ```
 */

export type * from './types';
export {
  Button, type ButtonProps,
  Panel, type PanelProps,
  Text, type TextProps,
  Input, type InputProps,
  Toggle, type ToggleProps,
  Dropdown, type DropdownProps,
  Slider, type SliderProps,
  Image, type ImageProps
} from './core/components';
export { present } from './present';