/**
 * What stands in a face's place on a chest screen.
 *
 * A press reaches script as an item move. Live text reads an item's custom
 * name, and a look reads its current durability. These connectors bind those
 * values to the compiled faces.
 */

export {
  BUTTON_MAPPINGS, CELL, CELL_VAR, CHEST, placed, SLOT_VAR, TEXT_DEF, whenDisabled, whenEnabled,
} from './cell';
export { grid, type Grid } from './grid';
export { look, type LookVersion } from './look';
export { press, pressDefs, type PressLook } from './press';
export {
  containerItemVars, ensureForeignCell, foreignSlot, slot,
  type ForeignSlot, type OwnSlot,
} from './slot';
export { text, textDef, type TextRun } from './text';
