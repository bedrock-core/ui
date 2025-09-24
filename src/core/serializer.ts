import { SerializableComponent, SerializablePrimitive } from '../types/serialization';

/**
 * Per-field unique marker characters appended AFTER the fixed-width padded payload.
 * This makes each full field substring unique even when two field values & padding are identical.
 * JSON UI subtraction removes ALL occurrences, so uniqueness is required to avoid unintentionally
 * stripping later identical fields. With a unique trailing marker per field, removing the first
 * field substring cannot match a later one (different marker) even if the padded content matches.
 *
 * NOTE: This increases the protocol length by +1 char per field. Decoders using the
 * progressive subtraction pattern must now slice (width + 1) for the raw field, then use a
 * secondary slice (original width) to read the actual value ignoring the trailing marker.
 * (Example for a 32-byte string: raw = ('%.33s' * #payload); value = ('%.32s' * #raw) - ';')
 */
export const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');

export const PAD_CHAR = ';';

// Protocol version tag (format: 'v' + 4 characters)
// e.g., 'bcuiv0001'
// Increment when making backward-incompatible changes to the payload layout.
export const VERSION = 'v0001';
export const PROTOCOL_HEADER = `bcui${VERSION}`;

// Public protocol constants (exported for tests and decoders)
export const PADDED_WIDTH = {
  s: 32,
  i: 16,
  f: 24,
  b: 5,
};

export const SLICE_WIDTH = {
  s: PADDED_WIDTH.s + 3, // 2 prefix + 1 marker
  i: PADDED_WIDTH.i + 3,
  f: PADDED_WIDTH.f + 3,
  b: PADDED_WIDTH.b + 3,
};

// Type prefix characters used for encoding
export const TYPE_PREFIX = {
  s: 's',
  i: 'i',
  f: 'f',
  b: 'b',
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
    } else if (code >= 0xd800 && code <= 0xdfff) {
      bytes += 4; // surrogate pair (4 bytes)
      i++; // skip low surrogate
    } else {
      bytes += 3;
    }
  }

  return bytes;
}

/**
 * Truncate string to N bytes safely
 * @param str
 * @param maxBytes
 * @returns
 */
function utf8Truncate(str: string, maxBytes: number): string {
  let bytes = 0;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    let charBytes = 0;

    if (code <= 0x7f) {
      charBytes = 1;
    } else if (code <= 0x7ff) {
      charBytes = 2;
    } else if (code >= 0xd800 && code <= 0xdfff) {
      charBytes = 4;
      i++; // skip low surrogate
    } else {
      charBytes = 3;
    }

    if (bytes + charBytes > maxBytes) {
      break;
    }

    bytes += charBytes;
    result += str[i];

    if (charBytes === 4) {
      result += str[i]; // add low surrogate
    }
  }

  return result;
}

function getFieldMarker(index: number): string {
  if (index >= FIELD_MARKERS.length) {
    throw new Error(`serialize(): exceeded supported field marker count (${FIELD_MARKERS.length}).`);
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
    return utf8Truncate(str, length);
  }

  return str + PAD_CHAR.repeat(length - currentLength);
}

/**
 * Serialize component to a string payload.
 * The returned payload is prefixed with `bcui` + VERSION (e.g., `bcuiv0001`).
 *
 * @param component - The component data to serialize (flat object with primitives)
 * @returns [serialized component string, total byte length]
 */
export function serialize({ type, ...rest }: SerializableComponent): [string, number] {
  const entries = Object.entries<SerializablePrimitive>({ type, ...rest });

  let totalBytes = 0;

  const segments = entries.map(([key, value]: [string, SerializablePrimitive], index: number): string => {
    let core: string;
    let widthBytes: number;

    if (typeof value === 'string') {
      core = `${TYPE_PREFIX.s}:${padToByteLength(value, PADDED_WIDTH.s)}`;
      widthBytes = SLICE_WIDTH.s;
    } else if (typeof value === 'boolean') {
      const val = value ? 'true' : 'false';

      core = `${TYPE_PREFIX.b}:${padToByteLength(val, PADDED_WIDTH.b)}`;
      widthBytes = SLICE_WIDTH.b;
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        core = `${TYPE_PREFIX.i}:${padToByteLength(value.toString(), PADDED_WIDTH.i)}`;
        widthBytes = SLICE_WIDTH.i;
      } else {
        core = `${TYPE_PREFIX.f}:${padToByteLength(value.toString(), PADDED_WIDTH.f)}`;
        widthBytes = SLICE_WIDTH.f;
      }
    } else {
      throw new Error(`serialize(): unsupported type for property "${key}"`);
    }

    totalBytes += widthBytes;

    return core + getFieldMarker(index);
  });

  // Prefix with identifier and protocol version
  const prefix = PROTOCOL_HEADER;
  const result = prefix + segments.join('');
  const finalBytes = totalBytes + utf8ByteLength(prefix);

  return [result, finalBytes];
}
