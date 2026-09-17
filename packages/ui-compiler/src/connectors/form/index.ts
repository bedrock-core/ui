/**
 * What stands in a face's place on a server form.
 *
 * A form carries nothing while it is open. Everything alive on the screen
 * travels in the entries the engine hands back in one response, so every
 * mechanism here is the same shape: an index host naming an entry, and a
 * control under it reading that entry's own string.
 */

export {
  ENTRY_PROPERTY, entryHost, entryText, entryValueBinding, MODAL_COLLECTION, payloadBindingFor,
  placed, whenEnabled,
} from './entry';
export { field, type NativeField } from './field';
export {
  dropdownWidget, inputWidget, popupHostOf, TOGGLE_ROW, toggleWidget,
} from './widget';
export { fits, type Fits } from './fits';
export { list, type Count } from './list';
export { multiSelect, type MultiSelect } from './multiselect';
export { popupOverlay, type Popup } from './popup';
export { press, pressDefs, type PressLook } from './press';
export { optionStates, select, OPTION_TOGGLE, STUB, type Select, type SelectOption } from './select';
export { text, textDef, type TextCarrier } from './text';
export { texture, textureDef, TEXTURE_DEF } from './texture';
export { visible, type Gate } from './visible';
