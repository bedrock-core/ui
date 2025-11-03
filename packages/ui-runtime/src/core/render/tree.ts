import type { Player } from '@minecraft/server';
import type { JSX } from '../../jsx';
import { deleteFiber, getFibersForPlayer } from '../fabric';
import { applyInheritance, expandAndResolveContexts, normalizeChildren } from './phases';
import { createInitialContext, createRootContext } from './traversal';

/**
 * Build the complete JSX element tree by running all transformation phases.
 * This is the entry point for the RENDERING PHASE where all components are
 * called, instances created, and hooks initialized.
 *
 * TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering - this function): Build tree, create instances, initialize hooks
 * Phase 2 (Logic - background): Effects run while form is displayed
 *
 * Four-phase tree building:
 * Phase 1: Expand function components and resolve contexts
 * Phase 2: Normalize children structure
 * Phase 3: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
 *
 * @param element - Root JSX element to build
 * @param player - Player rendering the component
 * @returns Fully processed JSX element tree and list of created instances
 */
export async function buildTree(
  element: JSX.Element,
  player: Player,
): Promise<JSX.Element> {
  // Initialize traversal context
  const context = createInitialContext();

  // Phase 1: Expand function components and resolve contexts
  // This creates instances for ALL components in the tree
  let result = await expandAndResolveContexts(element, context, player);

  // Phase 2: Normalize children structure
  result = normalizeChildren(result, context);

  // Phase 3: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
  // Initialize with root parent state
  const rootContext = createRootContext(context);

  // If player has any fibers with unresolved Suspense, disable interactions at root
  const hasUnresolvedSuspense = getFibersForPlayer(player).some(fiber => !!fiber?.suspense && !fiber.suspense.isResolved);

  if (hasUnresolvedSuspense) {
    // Disable all interactive controls while a boundary is pending
    rootContext.parentState!.enabled = false;
  }

  result = applyInheritance(result, rootContext);

  return result;
}

/**
 * Clean up all fibers for a player (stop effects, delete instances).
 *
 * @param player - Player whose components are being cleaned up
 */
export function cleanupComponentTree(player: Player): void {
  const fiberIds = getFibersForPlayer(player);
  // Sort by depth (deepest first) to clean up children before parents
  const sortedFibers = fiberIds.sort((a, b) => {
    const depthA = (a.id.match(/\//g) || []).length;
    const depthB = (b.id.match(/\//g) || []).length;

    return depthB - depthA;
  });

  for (const fiber of sortedFibers) {
    deleteFiber(fiber.id);
  }
}
