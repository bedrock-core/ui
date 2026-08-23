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

export {
  Background,
  Button,
  CHEST_CANVAS,
  Container,
  DynamicText,
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
  DynamicTextProps,
  FillDirection,
  FillProps,
  ProgressProps,
  SlotGridProps,
  SlotProps,
  SlotRole,
  VanillaProps,
} from './components/container';
