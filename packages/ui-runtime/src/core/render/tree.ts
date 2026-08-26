import { MAX_POOLED_SCROLLS } from '../../components/Scroll';
import type { JSX } from '../../jsx';
import { deleteFiber, getFibersForOwner, type Owner } from '../fabric';
import { applyInheritance, computeLayout, expandAndResolveContexts } from './phases';
import { createInitialContext, createRootContext, type TraversalContext } from './traversal';
import { validateContainer } from './validateContainer';
import { validateForm } from './validateForm';

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
 * Phase 2: Compute layout using flexbox algorithm (resolves sizes and positions to absolute Pocket-space texels)
 * Phase 3: Apply parent-child inheritance rules (visibility, enabled)
 * Phase 4: Enforce the rules of the backend the owner implies
 *
 * @param element - Root JSX element to build
 * @param owner - Who the render belongs to: a player for a form, an entity or the build for a container screen
 * @returns Fully processed JSX element tree and list of created instances
 */
export function buildTree(element: JSX.Element, owner: Owner): JSX.Element {
  // Initialize traversal context
  const context: TraversalContext = createInitialContext();

  // Reset tree relations for this owner's existing fibers before rebuilding
  const existing = getFibersForOwner(owner);

  for (const f of existing) {
    f.parent = undefined;
    f.child = undefined;
    f.sibling = undefined;
    f.index = -1;
  }

  // Phase 1: Expand function components and resolve contexts
  // This creates instances for ALL components in the tree
  // Returns "LayoutProps"
  let result: JSX.Element = expandAndResolveContexts(element, context, owner);

  // Phase 2: Compute layout using flexbox algorithm
  // Resolves sizes and x/y positions to absolute Pocket-space texels
  // Returns "NormalizedControlProps"
  // A form draws its scrolls from the render pack's fixed pool; a compiled
  // screen emits a scroll region per <Scroll>, so nothing caps it.
  result = computeLayout(result, owner.kind === 'player' ? MAX_POOLED_SCROLLS : Number.POSITIVE_INFINITY, owner.kind !== 'player');

  // Phase 3: Apply parent-child inheritance rules (visibility, enabled)
  // Initialize with root parent state
  const rootContext = createRootContext(context);

  result = applyInheritance(result, rootContext);

  // Phase 4: The owner decides the backend, and the backend decides which rules
  // the built tree has to satisfy — a form for a player, a compiled container
  // screen for an entity or a build — so dynamically-built or type-escaped
  // trees fail loud before anything is presented or emitted.
  if (owner.kind === 'player') {
    validateForm(result);
  } else {
    validateContainer(result);
  }

  return result;
}

/**
 * Clean up all fibers for an owner (stop effects, delete instances).
 *
 * @param owner - Whose components are being cleaned up
 */
export function cleanupComponentTree(owner: Owner): void {
  const fibers = getFibersForOwner(owner);

  // Sort by depth (deepest first) to clean up children before parents
  const sortedFibers = fibers.sort((a, b) => {
    const depthA = (a.id.match(/\//g) || []).length;
    const depthB = (b.id.match(/\//g) || []).length;

    return depthB - depthA;
  });

  for (const fiber of sortedFibers) {
    deleteFiber(fiber.id);
  }
}
