import { JSXProps } from '../../jsx/jsx-runtime';
import { ReservedBytes, SerializableComponent } from '../../types';
import { reserveBytes } from '../serializer';

export { Fragment, type FragmentProps } from './Fragment';
export { Panel, type PanelProps } from './Panel';
export { Text, type TextProps } from './Text';
export { Image, type ImageProps } from './Image';

export interface ControlProps extends JSXProps {
  // All positioning and sizing values are numbers, will not support string types like "100px", "100%", "100%c"... too much issues in json ui
  // All mandatory as we are going to go with fixed absolute sizing and positioning
  width: number;
  height: number;
  x: number;
  y: number;
  visible?: boolean;
  enabled?: boolean;
  // Not working currently
  // layer?: number;
  // alpha?: number;
  // Makes no sense until we have flexbox or similar layouting
  // inheritMaxSiblingWidth?: boolean;
  // inheritMaxSiblingHeight?: boolean;

  /* @internal */
  __reserved?: ReservedBytes;
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least these values as they define the base control properties.
 *
 * SERIALIZATION ORDER (must match control.json deserialization):
 * After protocol header (9 bytes: "bcuiv0001"), fields are deserialized in this exact order:
 *
 * Field 0: type (string, 35 bytes) - component type identifier
 * Field 1: width (number, 27 bytes) - element width
 * Field 2: height (number, 27 bytes) - element height
 * Field 3: x (number, 27 bytes) - horizontal position
 * Field 4: y (number, 27 bytes) - vertical position
 * Field 5: visible (bool, 8 bytes) - visibility state
 * Field 6: enabled (bool, 8 bytes) - interaction enabled state
 * Field 7: layer (number, 27 bytes) - z-index layering
 * Field 8: alpha (number, 27 bytes) - element transparency
 * Field 9: inheritMaxSiblingWidth (bool, 8 bytes) - width inheritance flag
 * Field 10: inheritMaxSiblingHeight (bool, 8 bytes) - height inheritance flag
 *
 * Reserved: 512 - (protocol header width + all fields width bytes) = 274
 * (up to 512 bytes total reserved block for future expansion)
 *
 * Component-specific properties are appended after the reserved block.
 *
 * @param props Component properties extending ControlProps
 * @returns Object with all control properties filled with defaults and canonical ordering
 */
export function withControl(props: SerializableComponent): Required<SerializableComponent> {
  const {
    type,
    width,
    height,
    x,
    y,
    visible,
    enabled,
    layer,
    alpha,
    inheritMaxSiblingWidth,
    inheritMaxSiblingHeight,
    // rest of props are the props specific to the component, which will be appended at the end
    ...rest
  } = props;

  // Create object with properties in exact canonical order for stable serialization
  return {
    type,
    width,
    height,
    x,
    y,
    visible: visible ?? true,
    enabled: enabled ?? true,
    // even if not working we keep them for filling the byte space
    layer: layer ? Math.floor(layer as number) : 0,
    alpha: alpha ?? 1.0,
    inheritMaxSiblingWidth: inheritMaxSiblingWidth ?? false,
    inheritMaxSiblingHeight: inheritMaxSiblingHeight ?? false,
    __reserved: reserveBytes(274), // Reserve space for future expansion
    // rest of props are the props specific to the component, which will be appended at the end
    ...rest,
  };
}
