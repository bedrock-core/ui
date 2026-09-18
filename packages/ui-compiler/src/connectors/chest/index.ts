/**
 * What stands in a face's place on a chest screen.
 *
 * A chest carries everything through container slots the runtime polls a tick
 * at a time. A press can only reach script as an item move, and a string can
 * only cross as numbers, one slot's stack size per character — or per look.
 * Every mechanism here is one of those facts spelled out as JSON UI.
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
