import { MODAL_COLLECTION, placed } from './entry';
import type { Connector, Control } from '../types';

/** A native field's payload: which vanilla row it mounts, at which index, with what. */
export interface NativeField {
  name: string;
  /** The row in `custom_form`, which is also the slot the answer arrives in. */
  address: number;
  /** The vanilla row definition this mounts, qualified. */
  definition: string;
  /**
   * What the mounted control is given: its size or its decode replacement, the
   * geometry it would otherwise read off a payload, and the author's faces.
   * Assembled by the kind, because only the kind knows which of them apply.
   */
  props: Control;
}

/**
 * A native modal field, placed by the pack.
 *
 * Every other kind on a compiled screen is drawn by the pack. This one cannot
 * be: a `ModalFormData` row is instantiated by VANILLA's factory, and the
 * interactive widget inside it — the thing that reads and writes the player's
 * answer — is the engine's. No definition replaces it.
 *
 * So the mechanism is a placement: the index host names the row, and the
 * engine's own widget sits under it exactly where the layout put the face.
 * `collection_index` is legal only on a direct child of a control declaring
 * `collection_name`, which is why the widget is wrapped rather than carrying
 * the index itself.
 */
export const field: Connector<NativeField> = (data, face) => ({
  [data.name]: {
    type: 'stack_panel',
    orientation: 'vertical',
    ...placed(face),
    collection_name: MODAL_COLLECTION,
    controls: [{
      [`field@${data.definition}`]: {
        collection_index: data.address,
        ...data.props,
      },
    }],
  },
});
