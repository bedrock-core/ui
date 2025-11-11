import { type Player } from '@minecraft/server';
import type { JSX } from '../../jsx';
import { deleteFiber, getFibersForPlayer } from '../fabric';
import { applyInheritance, expandAndResolveContexts } from './phases';
import { createInitialContext, createRootContext, type TraversalContext } from './traversal';

/**
 * Build the complete JSX element tree by running all transformation phases.
 * This is the entry point for the RENDERING PHASE where all components are
 * called, instances created, and hooks initialized.
 *
 * TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering - this function): Build tree, create instances, initialize hooks
 * Phase 2 (Logic - background): Effects run while form is displayed
 *
 * Three-phase tree building:
 * Phase 1: Expand function components and resolve contexts
 * Phase 2: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
 *
 * @param element - Root JSX element to build
 * @param player - Player rendering the component
 * @returns Fully processed JSX element tree and list of created instances
 */
export function buildTree(element: JSX.Element, player: Player): JSX.Element {
  // Initialize traversal context
  const context: TraversalContext = createInitialContext();

  // Reset tree relations for this player's existing fibers before rebuilding
  const existing = getFibersForPlayer(player);

  for (const f of existing) {
    f.parent = undefined;
    f.child = undefined;
    f.sibling = undefined;
    f.index = -1;
  }

  // Phase 1: Expand function components and resolve contexts
  // This creates instances for ALL components in the tree
  let result: JSX.Element = expandAndResolveContexts(element, context, player);

  // Phase 2: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
  // Initialize with root parent state
  const rootContext = createRootContext(context);

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
