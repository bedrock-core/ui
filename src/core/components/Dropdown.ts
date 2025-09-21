import type { DropdownComponent } from '../../types/json_ui/components';

export interface DropdownProps {
  label?: string;
  options: string[];
  selected?: string;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

// TODO OPTIONS, SELECTED
export function Dropdown({ label, options, selected, width, height, maxWidth, maxHeight }: DropdownProps): DropdownComponent {
  return {
    type: 'dropdown',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    dropdown_name: label,
    dropdown_content_control: 'dropdown_content',
  };
}