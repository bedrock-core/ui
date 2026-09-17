/**
 * Packing a component's props into the byte payload the render pack decodes.
 *
 * What still travels this way is DATA a compiled screen cannot bake: a
 * chooser's options, whose face and label the pack reads off each option's own
 * blob. Everything that is layout — a control's geometry, its state, its
 * textures — is a definition in the pack, picked by the screen's title.
 *
 * The layout is fixed-width and positional, so the pack can slice each field at
 * a known offset: every field is `<type prefix>:<padded value><marker>`, and the
 * marker makes each full substring unique so JSON UI's subtraction removes the
 * one it meant to.
 */
import type { RawMessage } from '@minecraft/server';
import { SerializablePrimitive, SerializableProps, SerializationError } from './types';

/**
 * This makes each full field substring unique even when two field values & padding are identical.
 * JSON UI subtraction removes ALL occurrences, so uniqueness is required to avoid unintentionally
 * stripping later identical fields. With a unique trailing marker per field, removing the first
 * field substring cannot match a later one (different marker) even if the padded content matches.
 */
export const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');

export const PAD_CHAR = ';';

// Protocol version tag (format: 'v' + 4 hex digits)
// e.g., 'corev0009'
// Increment when making backward-incompatible changes to the payload layout.
// v0006: added the common `region` field (carved from the reserved block) and
// generalized the title metadata to carry one extent per region.
// v0007: scroll-component model — the title carries a flat list of scroll viewports
// (axis + geometry + content extent) instead of a screen type + per-region extents.
// The component `region` field now holds the scroll index it belongs to.
// v0008: label group reordered to [fontType, fontScale, x, y, text], and the
// text of TERMINAL payloads (Text cells) is a variable-length TAIL — unpadded,
// unprefixed, uncapped. A RawMessage tail turns the form text into a rawtext
// pair [{ text: <fixed fields> }, <tail>], resolved by the CLIENT.
// v0009: the header prefix is `core`, like every identifier the library mints.
export const VERSION = 'v0009';
export const PROTOCOL_HEADER = `core${VERSION}`;
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
 * Serialize component type and props to a string payload.
 *
 * @param component - Component type and props
 * @returns [serialized component string, total byte length]
 */
export function serializeProps({ type, ...props }: SerializableProps & { type: string }): [string | RawMessage, number] {
  let totalBytes = 0;
  let rawTail: RawMessage | undefined;

  const entries = Object.entries({ type, ...props });
  const segments = entries.map(([key, value]: [string, SerializablePrimitive], index: number): string => {
    let core: string;
    let widthBytes: number;
    let rawStr: string;

    if (typeof value === 'object' && value !== null && 'tail' in value) {
      // Variable-length tail: MUST be the final field — everything before it
      // decodes at fixed offsets, the tail is simply "the rest".
      if (index !== entries.length - 1) {
        throw new SerializationError(`serialize(): tail property "${key}" must be the last field of the payload`);
      }

      if (typeof value.tail === 'string') {
        totalBytes += utf8ByteLength(value.tail);

        return value.tail; // no prefix, no pad, no marker
      }

      rawTail = value.tail;

      return ''; // composed after the fixed prefix below
    } else if (typeof value === 'boolean') {
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

  if (rawTail !== undefined) {
    // The client resolves the rawtext BEFORE the RP's bindings read the form
    // text: fixed fields keep their byte offsets, the resolved translation
    // (client language, `with` filled) lands in the tail region.
    return [{ rawtext: [{ text: result }, rawTail] }, finalBytes];
  }

  return [result, finalBytes];
}
