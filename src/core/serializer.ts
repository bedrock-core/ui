import { ReservedBytes, SerializableComponent, SerializablePrimitive } from '../types/serialization';
import { withControl } from './components';

/**
 * This makes each full field substring unique even when two field values & padding are identical.
 * JSON UI subtraction removes ALL occurrences, so uniqueness is required to avoid unintentionally
 * stripping later identical fields. With a unique trailing marker per field, removing the first
 * field substring cannot match a later one (different marker) even if the padded content matches.
 */
export const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');

export const PAD_CHAR = ';';

// Protocol version tag (format: 'v' + 4 hex digits)
// e.g., 'bcuiv0001'
// Increment when making backward-incompatible changes to the payload layout.
export const VERSION = 'v0001';
export const PROTOCOL_HEADER = `bcui${VERSION}`;
export const PROTOCOL_HEADER_LENGTH = 9; // bytes, all characters are single-byte ASCII

// Public protocol constants (exported for tests and decoders)
export const TYPE_WIDTH = {
  s: 32,
  n: 24,
  b: 5,
  r: 0, // variable
};

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
    let chunk = '';

    if (code <= 0x7f) {
      charBytes = 1;
      chunk = str[i];
    } else if (code <= 0x7ff) {
      charBytes = 2;
      chunk = str[i];
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate, pair with following low surrogate if valid
      const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        charBytes = 4;
        chunk = str[i] + str[i + 1];
      } else {
        // Unpaired high surrogate, treat as 3-byte replacement
        charBytes = 3;
        chunk = str[i];
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Unpaired low surrogate, treat as 3 bytes
      charBytes = 3;
      chunk = str[i];
    } else {
      charBytes = 3;
      chunk = str[i];
    }

    if (bytes + charBytes > maxBytes) {
      break;
    }

    bytes += charBytes;
    result += chunk;
    if (charBytes === 4) {
      i++; // consume the low surrogate as well
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
 * Reserves a specific number of bytes for future use.
 * @param bytes - number of bytes to reserve
 * @returns A ReservedBytes object representing the reserved space
 */
export function reserveBytes(bytes: number): ReservedBytes {
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new Error('Reserved bytes must be a positive integer');
  }

  return { __type: 'reserved', bytes };
}

/**
 * Serialize component to a string payload.
 * The returned payload is prefixed with `bcui` + VERSION (e.g., `bcuiv0001`).
 *
 * @param component - The component data to serialize (flat object with primitives)
 * @returns [serialized component string, total byte length]
 */
export function serialize(props: SerializableComponent): [string, number] {
  const { type, ...rest } = withControl(props);

  const entries = Object.entries<SerializablePrimitive>({ type, ...rest });

  let totalBytes = 0;

  const segments = entries.map(([key, value]: [string, SerializablePrimitive], index: number): string => {
    let core: string;
    let widthBytes: number;
    let rawStr: string;

    if (typeof value === 'string') {
      rawStr = value;
      core = `${TYPE_PREFIX.s}:${padToByteLength(value, TYPE_WIDTH.s)}`;
      widthBytes = FULL_WIDTH.s;
    } else if (typeof value === 'boolean') {
      rawStr = value ? 'true' : 'false';
      core = `${TYPE_PREFIX.b}:${padToByteLength(rawStr, TYPE_WIDTH.b)}`;
      widthBytes = FULL_WIDTH.b;
    } else if (typeof value === 'number') {
      rawStr = value.toString();
      core = `${TYPE_PREFIX.n}:${padToByteLength(rawStr, TYPE_WIDTH.n)}`;
      widthBytes = FULL_WIDTH.n;
    } else if (typeof value === 'object' && value !== null && value.__type === 'reserved') {
      rawStr = '';
      // Do not append prefix as we do not have prefix or marker for reserved bytes for easier JSON UI skipping
      core = `${PAD_CHAR.repeat(value.bytes - 1)}`; // -1 for marker
      widthBytes = value.bytes;
    } else {
      throw new Error(`serialize(): unsupported type for property "${key}": ${typeof value} (value: ${JSON.stringify(value)})`);
    }

    totalBytes += widthBytes;

    const marker = getFieldMarker(index);

    return core + marker;
  });

  // Prefix with identifier and protocol version
  const prefix = PROTOCOL_HEADER;
  const result = prefix + segments.join('');
  const finalBytes = totalBytes + utf8ByteLength(prefix);

  // Logger.log(`[serialize] header=${prefix} fields=${entries.length} payloadBytes=${finalBytes}`);

  return [result, finalBytes];
}
