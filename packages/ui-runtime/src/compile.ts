/**
 * Build-time surface, for tooling rather than for addons.
 *
 * A compiled screen is rendered on a build machine: no player, no fibers, no
 * lifecycle. The two phases that survive that — expansion and layout — are the
 * only ones a compiler needs, and they are kept off the main entry point so an
 * addon never imports them by accident.
 *
 * The pipeline is:
 *
 *   expandStatic  ->  computeLayout  ->  (@bedrock-core/ui-compile) toIr  ->  emit
 */

export { CompileTimeHookError, computeLayout, expandStatic } from './core/render/phases';

// The character table is the contract between the compiler and the runtime: the
// compiler generates the .lang from it, the runtime encodes against it.
export {
  BLANK_CODE, BLANK_VALUE, CHARSET, charsetLang, encode, MAX_CODE, UNKNOWN_CODE,
} from './container/charset';

// The library's own label, re-exported under a name that says what it is: it is
// baked into the layout, so it may contain any character at all, but it cannot
// change. `Text` is the live one, because that is what a screen usually wants.
export { Text as StaticText } from './components/Text';

export {
  Background,
  Button,
  CHEST_CANVAS,
  Container,
  Text,
  Fill,
  Hotbar,
  PlayerInventory,
  Progress,
  Slot,
  SLOT_SIZE,
  SlotGrid,
  Vanilla,
} from './components/container';

export type {
  ButtonProps,
  ContainerProps,
  TextProps,
  FillDirection,
  FillProps,
  ProgressProps,
  SlotGridProps,
  SlotProps,
  SlotRole,
  VanillaProps,
} from './components/container';
