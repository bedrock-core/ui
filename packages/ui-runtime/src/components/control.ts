import { JSX } from '../jsx/jsx-runtime';

export interface ControlProps {
  // All positioning and sizing values are numbers, will not support string types like "100px", "100%", "100%c"... too much issues in json ui
  width: number | string;
  height: number | string;
  x?: number | string;
  y?: number | string;
  visible?: boolean;
  enabled?: boolean;
  position?: 'absolute' | 'relative';
  // Not working currently
  // layer?: number;
  // alpha?: number;
  // Makes no sense until we have flexbox or similar layouting
  // inheritMaxSiblingWidth?: boolean;
  // inheritMaxSiblingHeight?: boolean;
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least these values as they define the base control properties.
 *
 * SERIALIZATION ORDER (must match control.json deserialization):
 * Protocol v0003 - Unified field width: strings and numbers both use 83 bytes (80 content + 2 prefix + 1 marker)
 * After protocol header (9 bytes: "bcuiv0003") and type (string, 83 bytes), fields are serialized in this exact order:
 *
 * Byte Allocation Map (1024-byte control block):
 * [0-8]:     Protocol header (9 bytes)
 * [9-91]:    Type field (string, 83 bytes)
 * [92-174]:  Field 1: width (number, 83 bytes) - element width
 * [175-257]: Field 2: height (number, 83 bytes) - element height
 * [258-340]: Field 3: x (number, 83 bytes) - horizontal position
 * [341-423]: Field 4: y (number, 83 bytes) - vertical position
 * [424-431]: Field 5: visible (bool, 8 bytes) - visibility state
 * [432-439]: Field 6: enabled (bool, 8 bytes) - interaction enabled state
 * [440-522]: Field 7: layer (number, 83 bytes) - z-index layering
 * [523-605]: Field 8: alpha (number, 83 bytes) - element transparency
 * [606-613]: Field 9: inheritMaxSiblingWidth (bool, 8 bytes) - width inheritance flag
 * [614-621]: Field 10: inheritMaxSiblingHeight (bool, 8 bytes) - height inheritance flag
 * [622-1023]: Reserved (402 bytes)
 *
 * Reserved calculation: 1024 - 9 - 83 - (6 × 83) - (4 × 8) = 402 bytes
 * (up to 1024 bytes total reserved block for future expansion)
 *
 * Component-specific properties are appended after the reserved block.
 *
 * NOTE: The 'position' property is used during tree traversal for relative positioning calculations,
 * but is NOT serialized to the payload (stored as __position with __ prefix to exclude from serialization).
 *
 * @param props Component properties extending ControlProps
 * @returns Object with all control properties filled with defaults and canonical ordering
 */
export function withControl(props: JSX.Props): JSX.Props {
  const {
    width,
    height,
    x,
    y,
    visible,
    enabled,
    position,
  } = props;

  // Create object with properties in exact canonical order for stable serialization
  return {
    width,
    height,
    x: x ?? 0,
    y: y ?? 0,
    visible: visible ?? true,
    enabled: enabled ?? true,
    // even if not working we keep them for filling the byte space
    layer: 0,
    alpha: 1.0,
    inheritMaxSiblingWidth: false,
    inheritMaxSiblingHeight: false,
    $reserved: { bytes: 402 }, // Reserve space for future expansion (v0003: 402 bytes)
    __position: position ?? 'relative', // Internal only: not serialized (__ prefix excludes it)
  };
}
