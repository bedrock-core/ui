import { FULL, topLeft } from '../../faces';
import { MODAL_COLLECTION } from './entry';
import type { ControlEntry } from '../types';

/** Draws over everything the screen put down, the way the interpreted overlay's layer does. */
const POPUP_LAYER = 300;

/** One dropdown's popup: which row it belongs to, and how its card looks. */
export interface Popup {
  /** The dropdown control's name; the popup is named after it. */
  name: string;
  /** The row in `custom_form` whose open state this popup follows. */
  address: number;
  texture: string;
  height: number;
}

/**
 * One popup per dropdown, hung at the SCREEN ROOT.
 *
 * The interpreted screen gets its popups from `modal_container`'s
 * `popup_overlay` factory — one router per row, each decoding what it needs
 * from its row's payload. A factory cannot pass per-row variables and a
 * compiled row has no payload, so the compiled screen bakes its own router per
 * dropdown, given that cell's row index, popup surface and height.
 * `$open_gate` keeps only the open-state half of the shared gate: the other
 * half reads a payload that never arrives, and only a dropdown row has an
 * open-state channel at all.
 *
 * At the root, not in the cell: the popup must draw over the whole screen, and
 * the one attempt to mount it inside the native dropdown's own subtree crashed
 * the client, because the names in there are the engine's to resolve.
 *
 * @param host - The control every dropdown of this screen names as its popup
 *   area, so the engine's input shield adopts this layer wherever the screen
 *   is mounted.
 * @param width - The screen's width. The interpreted card is 16px narrower
 *   than its form so the popup's scrollbar clears the form's own; kept for the
 *   look, though a compiled card has nothing to scroll.
 */
export const popupOverlay = (host: string, popups: readonly Popup[], width: number): ControlEntry[] => {
  if (popups.length === 0) {
    return [];
  }

  const cards = popups.map((popup): ControlEntry => ({
    [`${popup.name}_popup`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: FULL,
      ...topLeft,
      layer: POPUP_LAYER,
      collection_name: MODAL_COLLECTION,
      controls: [{
        'popup@core_ui_form_components.dropdown_popup_router': {
          collection_index: popup.address,
          size: FULL,
          $compiled: true,
          $open_gate: '#custom_dropdown',
          $popup_texture: popup.texture,
          $popup_size: [Math.max(0, width - 16), popup.height],
        },
      }],
    },
  }));

  return [{ [host]: { type: 'panel', size: FULL, ...topLeft, layer: POPUP_LAYER, controls: cards } }];
};
