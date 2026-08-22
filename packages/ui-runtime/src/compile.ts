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

export {
  CHEST_CANVAS,
  Container,
  Progress,
  Slot,
  SlotGrid,
  SLOT_SIZE,
} from './components/container';

export type {
  ContainerProps,
  FillDirection,
  ProgressProps,
  SlotGridProps,
  SlotProps,
} from './components/container';
