import type { Component, ToggleComponent } from '../../types/json_ui/components';

export interface ToggleProps {
  label?: string;
  checked?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

export function Toggle({ label, checked, width, height, maxWidth, maxHeight }: ToggleProps): ToggleComponent {
  return {
    type: 'toggle',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    toggle_name: label,
    toggle_default_state: checked,
  };
}
