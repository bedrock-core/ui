import { SerializableComponent, SerializablePrimitive } from '../types/serialization';

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

const PAD_CHAR = ';';

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
const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');

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
 * Serialize component to a string
 * @param the component to serialize
 * @returns [serialized component, byte length]
 */
export function serialize({ type, ...rest }: SerializableComponent): [string, number] {
  const entries = Object.entries<SerializablePrimitive>({ type, ...rest });

  let totalBytes = 0;

  const segments = entries.map(([key, value]: [string, SerializablePrimitive], index: number): string => {
    let core: string;
    let widthBytes: number;

    if (typeof value === 'string') {
      core = `s:${padToByteLength(value, 32)}`;
      widthBytes = 35; // 32 value bytes + 2 prefix + 1 marker
    } else if (typeof value === 'boolean') {
      const val = value ? 'true' : 'false';

      core = `b:${padToByteLength(val, 5)}`;
      widthBytes = 8; // 5 value bytes + 2 prefix + 1 marker
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        core = `i:${padToByteLength(value.toString(), 16)}`;
        widthBytes = 19; // 16 value bytes + 2 prefix + 1 marker
      } else {
        core = `f:${padToByteLength(value.toString(), 24)}`;
        widthBytes = 27; // 24 value bytes + 2 prefix + 1 marker
      }
    } else {
      throw new Error(`serialize(): unsupported type for property "${key}"`);
    }

    totalBytes += widthBytes;

    return core + getFieldMarker(index);
  });

  const result = segments.join('');

  return [result, totalBytes];
}
