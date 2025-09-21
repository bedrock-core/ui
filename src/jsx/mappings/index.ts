import { mapPanel } from './panel';
import { mapText } from './text';
import { mapInput } from './input';
import { mapButton } from './button';
import { mapToggle } from './toggle';
import { mapDropdown } from './dropdown';
import { mapSlider } from './slider';
import { mapImage } from './image';
import type { Component } from '../../types/json_ui/components';
import type { JSXComponent } from '../../types/jsx/components';

export function mapJSXToJSONUI(jsxComponent: JSXComponent): Component {
  switch (jsxComponent.type.toLowerCase()) {
    case 'panel':
      return mapPanel(jsxComponent as any);

    case 'text':
      return mapText(jsxComponent as any);

    case 'input':
      return mapInput(jsxComponent as any);

    case 'button':
      return mapButton(jsxComponent as any);

    case 'toggle':
      return mapToggle(jsxComponent as any);

    case 'dropdown':
      return mapDropdown(jsxComponent as any);

    case 'slider':
      return mapSlider(jsxComponent as any);

    case 'image':
      return mapImage(jsxComponent as any);

    default:
      throw new Error(`Unknown JSX component type: ${jsxComponent.type}`);
  }
}

// Re-export individual mappers for direct use
export {
  mapPanel,
  mapText,
  mapInput,
  mapButton,
  mapToggle,
  mapDropdown,
  mapSlider,
  mapImage,
};