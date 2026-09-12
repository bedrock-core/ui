/**
 * Every look the library draws, and nothing else.
 *
 * A face is a pure function: data in, one JSON UI control out. It reads
 * nothing, binds nothing, allocates nothing and knows no host. Children arrive
 * already drawn, so no face recurses; a face that needs a shared definition is
 * handed its qualified name rather than the means to make one.
 *
 * That is the whole point of the layer. What a control LOOKS like is the same
 * on every screen, and what it physically IS — an entry a form reports, an item
 * taken and put straight back, a native field the engine owns — belongs to the
 * screen serving it and is stood in the face's place afterwards.
 *
 * Three families:
 *
 *  - **primitives** — one look with nothing composed. A leaf draws a control;
 *    a container holds what it was given, because the layout already solved
 *    every child a place of its own.
 *  - **compositions** — no look of their own. Each takes the drawn parts and
 *    adds the native plumbing that mixes them, which on a compiled screen is
 *    always a toggle: the one thing the client swaps without telling anyone.
 *  - **utils** — the vocabulary the two share.
 */

// Primitives: leaves.
export { stateFace } from './primitives/button';
export { dropdownFace, type DropdownFace } from './primitives/dropdown';
export { imageFace, type ImageFace } from './primitives/image';
export { inputFace, type InputFace } from './primitives/input';
export { optionParts, type OptionFace, type OptionState, type OptionStates } from './primitives/option';
export { sliderFace, TRACK_HEIGHT, THUMB_WIDTH, THUMB_HEIGHT, type SliderFace } from './primitives/slider';
export { slotFace, cell, CELL_PITCH, CELL_TEXTURE, type SlotFace } from './primitives/slot';
export { caption, label, placedCaption, textFace, type TextFace } from './primitives/text';
export { toggleFace, type ToggleFace } from './primitives/toggle';

// Primitives: containers.
export { embedFace, type EmbedFace } from './primitives/embed';
export { gridFace, type GridFace } from './primitives/grid';
export { listFace, type ListFace, type Row } from './primitives/list';
export { panelFace, type PanelFace } from './primitives/panel';
export { scrollContent, scrollFace, TRACK_WIDTH, type Axis, type ContentFace, type ScrollFace } from './primitives/scroll';

// Compositions.
export { selectFace, type SelectFace } from './compositions/select';

// The shared vocabulary.
export { entry, FONT_SIZE, FULL, HUG, offsetOf, over, placed, sizeOf, styled, surface, topLeft, UNSTYLED } from './utils/place';
export { shownWhileOn, swap, type SwapGroup, type SwapLooks } from './utils/swap';
export type { Box, Control, ControlEntry, Face, Rect, States, TextStyle } from './utils/types';
