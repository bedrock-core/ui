import type { Component } from '../../types/json_ui/components';
import type { SliderJSXComponent } from '../../types/jsx/components';

export function mapSlider(jsx: SliderJSXComponent): Component {
  return {
    ...jsx,
    type: 'slider',
  } as Component;
}