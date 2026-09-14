import { FORM_COLLECTION, FORM_DETAILS_BINDING, FORM_FLAG_OFF } from '@bedrock-core/ui-runtime/compile';
import { topLeft } from '../../faces';
import type { Binding, Control, ControlEntry } from '../../jsonui';
import { entryControl } from '../../nodes/utils/shared';

/**
 * What every mechanism on a form is made of: an entry, and the ways to read it.
 *
 * A form carries nothing while it is open. Everything alive on the screen
 * travels in the entries the engine hands back in one response, so every
 * mechanism here is the same shape — an index host naming an entry, and a
 * control under it reading that entry's own string.
 *
 * ## The one rule that is not optional
 *
 * A control owns its entry only if THE CONTROL ITSELF carries the
 * `collection_details` binding. A host above it supplying
 * `collection_index` is enough to read the entry and enough to be clicked, but
 * the press then reaches script as `canceled`, indistinguishable from Esc.
 * Every pressable control carries {@link FORM_DETAILS_BINDING}, and nothing at
 * build time can warn if it stops.
 */

/** The modal's collection, which answers in rows rather than button entries. */
export const MODAL_COLLECTION = 'custom_form';

/** Where an entry's own string arrives when a control reads it. */
export const ENTRY_PROPERTY = '#entry_value';

/** The face's placement, restated on the mechanism that replaces it. */
export const placed = (face: ControlEntry): Control => {
  const control = entryControl(face);

  return {
    size: control.size,
    offset: control.offset,
    ...topLeft,
    ...control.layer === undefined ? {} : { layer: control.layer },
    ...control.visible === false ? { visible: false } : {},
  };
};

/**
 * The index host.
 *
 * `collection_index` is legal only on a direct child of a control declaring
 * `collection_name`, and `collection_name` only on a `stack_panel`
 * or a `grid`. So everything that reads an entry gets a one-child stack above
 * it: the host carries the solved placement, the child carries the index.
 */
export const entryHost = (
  name: string,
  address: number,
  cell: string,
  face: ControlEntry,
  collection: string = FORM_COLLECTION,
): ControlEntry => ({
  [name]: {
    type: 'stack_panel',
    orientation: 'vertical',
    ...placed(face),
    collection_name: collection,
    controls: [{ [`cell@${cell}`]: { collection_index: address } }],
  },
});

/**
 * The string an addressed value travels on, per collection.
 *
 * Both collections carry the value in the entry's TEXT — an action form's
 * entries under `#form_button_text`, a modal's rows under `#custom_text`, the
 * only string each collection has. The icon path is never set, so vanilla's own
 * button draws no image and nothing has to hide one.
 *
 * A compiled control reads whichever by a plain collection binding. Plain is the
 * requirement, not a preference: an expression over an entry string — a `-` or
 * a `'%.Ns' *` format — copies it into the engine's 1024-byte stack string and
 * asserts when it does not fit, whatever gate the control sits behind.
 */
export const payloadBindingFor = (collection: string): string =>
  (collection === MODAL_COLLECTION ? '#custom_text' : '#form_button_text');

/** Reads the entry's own string, which is the only thing a form entry carries. */
export const entryText = (name: string, collection: string = FORM_COLLECTION): Binding[] => [
  { ...FORM_DETAILS_BINDING, binding_collection_name: collection },
  {
    binding_name: payloadBindingFor(collection),
    binding_name_override: name,
    binding_type: 'collection',
    binding_collection_name: collection,
  },
];

/** The value read for a gate: the entry's string alone, no details. */
export const entryValueBinding = (name: string, collection: string): Binding => ({
  binding_name: payloadBindingFor(collection),
  binding_name_override: name,
  binding_type: 'collection',
  binding_collection_name: collection,
});

/**
 * Visible only while the entry says this control may be used.
 *
 * A `button` with `enabled` bound to false still takes the press: the property
 * greys nothing and blocks nothing here, and gating the control out is the only
 * thing that stops one. A disabled button therefore has no button at all, only
 * its face — the same shape the chest host uses, for the same reason.
 */
export const whenEnabled = (visible: boolean): Binding[] => [
  ...entryText(ENTRY_PROPERTY),
  {
    binding_type: 'view',
    source_property_name: visible
      ? `(not (${ENTRY_PROPERTY} = '${FORM_FLAG_OFF}'))`
      : `(${ENTRY_PROPERTY} = '${FORM_FLAG_OFF}')`,
    target_property_name: '#visible',
  },
];
