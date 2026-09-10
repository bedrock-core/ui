/**
 * What more than one lowering needs.
 *
 * Reading props off an element, naming and sharing a look, and the one adapter
 * between an IR node and a face. Nothing here dispatches on a kind; anything
 * that does belongs to that kind's module, and anything a single HOST needs
 * belongs to that host's connector.
 */

import type { Box } from '../../faces';
import type { Control, ControlEntry } from '../../jsonui';
import type { Rect } from './types';

/** A literal inside a JSON UI expression is single-quoted. */
export const literal = (value: string): string => `'${value.replaceAll(String.fromCharCode(39), '')}'`;

// The geometry vocabulary is the faces layer's, re-exported here so a node
// that has not been converted yet still reads one definition of each.
export { FONT_SIZE, FULL, offsetOf, sizeOf, topLeft } from '../../faces';

/**
 * A node's box, as the face layer takes it: where it sits, and the two
 * decorations the author may have set. The one adapter between an IR node and
 * a face, so no kind restates the mapping.
 */
export const boxOf = (node: { name: string; rect: Rect; layer?: number; visible?: boolean }): Box => ({
  name: node.name,
  rect: node.rect,
  ...node.layer === undefined ? {} : { layer: node.layer },
  ...node.visible === false ? { hidden: true } : {},
});

/** Emitted only when the author asked, so nothing is layered by accident. */
export const layerOf = (node: { layer?: number }): { layer?: number } =>
  node.layer === undefined ? {} : { layer: node.layer };

/** Emitted only when the author hid the control, since visible is the default. */
export const visibilityOf = (node: { visible?: boolean }): { visible?: false } =>
  node.visible === false ? { visible: false } : {};

/** A collection name, made safe to sit in a definition name and a reference. */
export const collectionKey = (collection: string): string => collection.replaceAll(/[^A-Za-z0-9_]/g, '_');

export const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

/**
 * The string a serializing component parks in its `value` tail, or undefined
 * when the tail is a RawMessage the client would have resolved.
 */
export const tailOf = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('tail' in value)) {
    return undefined;
  }

  const { tail } = value;

  return typeof tail === 'string' ? tail : undefined;
};

/**
 * The name a shared face takes: its kind and a hash of everything that makes
 * it look the way it does. Two screens of one addon that draw the same look
 * therefore name the same definition, and the addon's `faces.json` holds it
 * once. FNV-1a, 32 bits, printed as eight hex digits; the face pass refuses
 * two different looks that land on one name.
 */
export const faceId = (kind: string, signature: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${kind}_${hash.toString(16).padStart(8, '0')}`;
};

/**
 * Registers a shared face under its id, or checks that the one already there
 * is the same look — a hash collision is a build error, never a silent swap.
 */
export const shareFace = (faces: Record<string, Control>, id: string, control: Control): string => {
  const existing = faces[id];

  if (existing === undefined) {
    faces[id] = control;
  } else if (JSON.stringify(existing) !== JSON.stringify(control)) {
    throw new Error(`Two different looks hash to the face "${id}"; rename or restyle one of them.`);
  }

  return id;
};

/** The one control a single-control entry holds. */
export const entryControl = (entry: ControlEntry): Control => {
  const [control] = Object.values(entry);

  if (control === undefined) {
    throw new Error('An entry holds no control.');
  }

  return control;
};

/**
 * Where a control sits, as the layout decided it: the properties a host may
 * never change when it stands a mechanism in for a face.
 */
export const placementOf = (control: Control): Record<string, unknown> => ({
  size: control.size,
  offset: control.offset,
  anchor_from: control.anchor_from,
  anchor_to: control.anchor_to,
  layer: control.layer,
});
