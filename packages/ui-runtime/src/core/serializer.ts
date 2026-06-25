import { ActionFormData } from '@minecraft/server-ui';
import { JSX } from '../jsx';
import { getComponentDescriptor, getRegisteredTypes, isTransparentType } from './componentRegistry';
import { isElement, isFunction, isSerializablePrimitive } from './guards';
import { SerializablePrimitive, SerializableProps, SerializationContext, SerializationError } from './types';

/**
 * This makes each full field substring unique even when two field values & padding are identical.
 * JSON UI subtraction removes ALL occurrences, so uniqueness is required to avoid unintentionally
 * stripping later identical fields. With a unique trailing marker per field, removing the first
 * field substring cannot match a later one (different marker) even if the padded content matches.
 */
export const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');

export const PAD_CHAR = ';';

// Protocol version tag (format: 'v' + 4 hex digits)
// e.g., 'bcuiv0007'
// Increment when making backward-incompatible changes to the payload layout.
// v0006: added the common `region` field (carved from the reserved block) and
// generalized the title metadata to carry one extent per region.
// v0007: scroll-component model — the title carries a flat list of scroll viewports
// (axis + geometry + content extent) instead of a screen type + per-region extents.
// The component `region` field now holds the scroll index it belongs to.
export const VERSION = 'v0007';
export const PROTOCOL_HEADER = `bcui${VERSION}`;
export const PROTOCOL_HEADER_LENGTH = 9; // bytes, all characters are single-byte ASCII

// Public protocol constants (exported for tests and decoders)
export const TYPE_WIDTH = {
  s: 80,
  n: 80,
  b: 5,
  r: 0, // variable
};

// TYPE_PREFIX + ':'
export const PREFIX_WIDTH = {
  s: 2,
  n: 2,
  b: 2,
  r: 0,
};

export const MARKER_WIDTH = 1; // 1 byte marker per field

export const FULL_WIDTH = {
  s: PREFIX_WIDTH.s + TYPE_WIDTH.s + MARKER_WIDTH,
  n: PREFIX_WIDTH.n + TYPE_WIDTH.n + MARKER_WIDTH,
  b: PREFIX_WIDTH.b + TYPE_WIDTH.b + MARKER_WIDTH,
  r: TYPE_WIDTH.r,
};

// Type prefix characters used for encoding
export const TYPE_PREFIX = {
  s: 's',
  n: 'n',
  b: 'b',
  r: 'r',
};

/**
 * Compute UTF-8 byte length
 * @param str
 * @returns
 */
function utf8ByteLength(str: string): number {
  let bytes = 0;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate, check for valid low surrogate to form a pair
      const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;

      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4; // surrogate pair (4 bytes)
        i++; // consume low surrogate
      } else {
        // Unpaired high surrogate, treat as 3 bytes (WTF-8 style) to avoid crash
        bytes += 3;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Unpaired low surrogate, treat as 3 bytes
      bytes += 3;
    } else {
      bytes += 3;
    }
  }

  return bytes;
}

function getFieldMarker(index: number, key: string): string {
  if (index >= FIELD_MARKERS.length) {
    throw new SerializationError(`serialize(): exceeded maximum number of 64 props in an element. Key: "${key}" and following do not fit`);
  }

  return FIELD_MARKERS[index];
}

/**
 * Pad string to exact byte length
 * @param str
 * @param length
 * @returns
 */
function padToByteLength(str: string, length: number): string {
  const currentLength = utf8ByteLength(str);

  if (currentLength > length) {
    throw new SerializationError(`serialize(): string ${str} exceeds maximum byte length of ${length} bytes, actual ${currentLength} bytes. Prefer to use translate keys for long texts.`);
  }

  return str + PAD_CHAR.repeat(length - currentLength);
}

/**
 * Serialize a JSX element and its children into the provided form.
 * @param element - JSX element to serialize
 * @param form - Form data to populate
 * @param context - Serialization context for collecting button callbacks
 */
export function serialize({ type, props: { children, ...rest } }: JSX.Element, form: ActionFormData, context: SerializationContext): void {
  // Function components should have been resolved by buildTree()
  // If we see one here, it's a bug
  if (typeof type === 'function') {
    throw new SerializationError(
      `serialize(): Encountered unresolved function component "${type.name || 'anonymous'}". `
      + `This is a bug - buildTree() should have called all function components before serialization.`,
    );
  }

  // Statically hidden subtree: `visible` is a build-time boolean and the form never
  // re-renders, so a hidden element can never become visible without a fresh serialize.
  // The layout pass already reserved its box (visible siblings carry final absolute
  // coords), so we drop it AND its children entirely — no payload bytes, no generator
  // slot, no button index consumed. This is the cost the Scroll "Performance" note warns
  // about: fewer items per generator. Default visible is `true`, so only an explicit
  // `visible={false}` triggers this.
  if (rest.visible === false) {
    return;
  }

  // Transparent components: do not emit payload, serialize children only
  if (isTransparentType(type)) {
    if (children) {
      const childArray = Array.isArray(children) ? children : [children];

      childArray.filter(isElement).forEach((child) => {
        serialize(child, form, context);
      });
    }

    return;
  }

  // Validate and filter props - ensure all props (except children) are serializable
  const serializableProps: SerializableProps = {};
  const invalidProps: string[] = [];
  const callbacks: Record<string, (...args: unknown[]) => void> = {};

  for (const [key, value] of Object.entries(rest)) {
    // Skip internal/runtime-only props
    if (key.startsWith('__')) {
      continue;
    }

    if (isSerializablePrimitive(value)) {
      serializableProps[key] = value;
    } else if (isFunction(value)) {
      // Store function props as callbacks - they're not serializable but valid for event handlers
      callbacks[key] = value;
    } else {
      invalidProps.push(`${key} (type: ${typeof value}, value: ${JSON.stringify(value)})`);
    }
  }

  // Throw error if any non-serializable props were found
  if (invalidProps.length > 0) {
    throw new SerializationError(
      `Component "${type}" has non-serializable props. All props must be primitives (string, number, boolean) or ReservedBytes. `
      + `Invalid props: ${invalidProps.join(', ')}. `
      + `Ensure all optional props have default values in the component definition.`,
    );
  }

  const [payload] = serializeProps({ type, ...serializableProps });

  const descriptor = getComponentDescriptor(type);

  if (!descriptor?.writer) {
    const known = getRegisteredTypes().join(', ');

    throw new SerializationError(`Unknown native component type: ${type}. Known types: ${known}`);
  }

  descriptor.writer(payload, form, context, callbacks, serializableProps);

  // Recursively handle children
  if (children) {
    const childArray = Array.isArray(children) ? children : [children];

    childArray.filter(isElement).forEach((child) => {
      serialize(child, form, context);
    });
  }
}

/**
 * Serialize component type and props to a string payload.
 *
 * @param component - Component type and props
 * @returns [serialized component string, total byte length]
 */
export function serializeProps({ type, ...props }: SerializableProps & { type: string }): [string, number] {
  let totalBytes = 0;

  const segments = Object.entries({ type, ...props }).map(([key, value]: [string, SerializablePrimitive], index: number): string => {
    let core: string;
    let widthBytes: number;
    let rawStr: string;

    if (typeof value === 'boolean') {
      rawStr = value ? 'true' : 'false';
      core = `${TYPE_PREFIX.b}:${padToByteLength(rawStr, TYPE_WIDTH.b)}`;
      widthBytes = FULL_WIDTH.b;
    } else if (typeof value === 'number') {
      rawStr = value.toString();
      core = `${TYPE_PREFIX.n}:${padToByteLength(rawStr, TYPE_WIDTH.n)}`;
      widthBytes = FULL_WIDTH.n;
    } else if (typeof value === 'object' && value.bytes !== undefined) {
      // Do not append prefix as we do not have prefix or marker for reserved bytes for easier JSON UI skipping
      core = `${PAD_CHAR.repeat(value.bytes - 1)}`; // -1 for marker
      widthBytes = value.bytes;
    } else if (typeof value === 'string') {
      rawStr = value;
      core = `${TYPE_PREFIX.s}:${padToByteLength(rawStr, TYPE_WIDTH.s)}`;
      widthBytes = FULL_WIDTH.s;
    } else {
      throw new SerializationError(`serialize(): unsupported type for property "${key}": ${typeof value} (value: ${JSON.stringify(value)})`);
    }

    totalBytes += widthBytes;

    const marker = getFieldMarker(index, key);

    return core + marker;
  });

  // Prefix with identifier and protocol version
  const prefix = PROTOCOL_HEADER;
  const result = prefix + segments.join('');
  const finalBytes = totalBytes + utf8ByteLength(prefix);

  return [result, finalBytes];
}

/**
 * Per-scroll geometry surfaced by the layout pass for title encoding.
 *
 * A scroll is a viewport rectangle on screen plus a scrollable content `extent` along its
 * `axis`. The RP pool of generic scroll controls reads one of these per index and
 * positions/sizes itself from it.
 */
export interface ScrollMetrics {
  /** Scroll axis: 'y' (vertical) or 'x' (horizontal). */
  axis: 'x' | 'y';
  /** Viewport top-left x (px, screen space). */
  x: number;
  /** Viewport top-left y (px, screen space). */
  y: number;
  /** Viewport width (px). */
  width: number;
  /** Viewport height (px). */
  height: number;
  /** Content extent (px) along the scroll axis — the scrollable length. */
  extent: number;
}

/** Per-scroll title field count: axis + x + y + width + height + extent. */
export const SCROLL_FIELD_COUNT = 6;

/**
 * Serialize the form title metadata: a flat list of scroll viewports.
 *
 * Layout: PROTOCOL_HEADER (9) + s:'scrolls' (83) + per scroll
 *   [ s:axis (83), n:x (83), n:y (83), n:width (83), n:height (83), n:extent (83) ].
 *
 * The leading `'scrolls'` field is a fixed marker (field 0) so every scroll block sits at a
 * predictable offset: scroll `i`'s block starts at FULL_WIDTH.s + i·(SCROLL_FIELD_COUNT·83)
 * bytes after the header. A pooled scroll whose index is beyond the emitted list decodes an
 * empty axis and hides itself — so no explicit count field is needed.
 *
 * Geometry is consumed RP-side via `use_anchored_offset` (viewport position) and
 * `#size_binding_*` (viewport size); the content panel uses the `[1,1]` size_anchor trick to
 * overflow only the scroll axis by `extent`.
 *
 * @param scrolls - Scroll viewports in index order (index 0 is the root scroll)
 * @returns Full title string for form.title()
 */
export function serializeScrollMetadata(scrolls: readonly ScrollMetrics[]): string {
  const fields: SerializableProps = {};

  scrolls.forEach((scroll, index) => {
    fields[`axis${index}`] = scroll.axis;
    fields[`x${index}`] = Math.round(scroll.x);
    fields[`y${index}`] = Math.round(scroll.y);
    fields[`width${index}`] = Math.round(scroll.width);
    fields[`height${index}`] = Math.round(scroll.height);
    fields[`extent${index}`] = Math.round(scroll.extent);
  });

  const [payload] = serializeProps({ type: 'scrolls', ...fields });

  return payload;
}
