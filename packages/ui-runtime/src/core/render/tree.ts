import { system, type Player } from '@minecraft/server';
import type { JSX } from '../../jsx';
import { deleteFiber, getFibersForPlayer, isSuspenseBoundary } from '../fabric';
import { type Fiber } from '../fabric/types';
import { applyInheritance, expandAndResolveContexts } from './phases';
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
 * Three-phase tree building:
 * Phase 1: Expand function components and resolve contexts
 * Phase 2: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
 *
 * @param element - Root JSX element to build
 * @param player - Player rendering the component
 * @returns Fully processed JSX element tree and list of created instances
 */
export function buildTree(element: JSX.Element, player: Player): [JSX.Element, boolean] {
  // Initialize traversal context
  const context = createInitialContext();

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

  // If player has any fibers with unresolved Suspense, disable interactions at root
  const hasUnresolvedSuspense: boolean = getFibersForPlayer(player).some(fiber => !!fiber?.suspense && !fiber.suspense.isResolved);

  if (hasUnresolvedSuspense) {
    // Disable all interactive controls while a boundary is pending
    rootContext.parentState.enabled = false;
  }

  result = applyInheritance(result, rootContext);

  let shouldPresentOnClose: boolean = false;

  const playerFibers: Fiber[] = getFibersForPlayer(player);
  const boundaryFibers = playerFibers.filter(isSuspenseBoundary);

  if (boundaryFibers.length > 0) {
    const nowTick: number = system.currentTick;
    const unresolvedBoundaries = boundaryFibers.filter(bf => !bf.suspense.isResolved);

    let newResolvedCount: number = 0;

    unresolvedBoundaries.forEach(bf => {
      const hooksReady: boolean = isBoundarySubtreeReady(bf);

      const startTick: number = bf.suspense.startTick;
      const timeoutTicks: number = bf.suspense.awaitTimeout;
      const endTick: number = startTick + timeoutTicks;

      if (hooksReady || nowTick >= endTick) {
        bf.suspense.isResolved = true;
        newResolvedCount++;
      }
    });

    if (unresolvedBoundaries.length > 0 && unresolvedBoundaries.length === newResolvedCount) {
      shouldPresentOnClose = true;
    }
  }

  return [result, shouldPresentOnClose];
}

function isBoundarySubtreeReady(root: Fiber): boolean {
  const stack: Fiber[] = [root];

  while (stack.length > 0) {
    // safe to assert non-undefined due to loop condition
    const node = stack.pop() as Fiber;

    for (const slot of node.hookStates) {
      if ((slot.tag === 'state' || slot.tag === 'reducer') && slot.resolved === false) {
        return false;
      }
    }

    // Push children and siblings; but avoid traversing the boundary root's sibling chain
    if (node.child) {
      stack.push(node.child);
    }

    if (node !== root && node.sibling) {
      stack.push(node.sibling);
    }
  }

  return true;
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
