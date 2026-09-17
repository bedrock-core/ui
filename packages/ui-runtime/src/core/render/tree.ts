import { hostFor, requireOwner } from '../../hosts';
import type { JSX } from '../../jsx';
import { deleteFiber, getFibersForOwner, type Owner } from '../fabric';
import { validate } from '../ir/validate';
import { applyInheritance, computeLayout, expandAndResolveContexts } from './phases';
import { createInitialContext, createRootContext, type TraversalContext } from './traversal';
import { beginWidthRound, buildLocales, endWidthRound } from './buildPass';
import { getSessionCompiled } from './session';

/** The most times one build render is laid out while composed text settles. */
const MAX_BUILD_PASSES = 3;

/** One laid-out pass of a render, with what the phases after it read. */
interface LaidOut {
  result: JSX.Element;
  context: TraversalContext;
  host: ReturnType<typeof hostFor>;
  frozen: boolean;
}

/** Phases 1 and 2 of {@link buildTree}: expand the element, then lay it out. */
function layoutPass(element: JSX.Element, owner: Owner, compiled?: boolean): LaidOut {
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
  const expanded: JSX.Element = expandAndResolveContexts(element, context, owner);

  // A fiber this pass never reached is an orphan — a component whose key
  // changed, or one a serialized tree stopped rendering. Deleting it runs its
  // hook cleanups and forgets its state NOW, so a key that flips back gets a
  // fresh instance (React's reset semantics) instead of resurrecting the old
  // one at screen close.
  for (const fiber of existing) {
    if (!context.visited.has(fiber.id)) {
      deleteFiber(fiber.id);
    }
  }

  // Which screen this tree is for, decided by the root the author wrote —
  // `<Container>` is a chest screen the way `<Form>` is a modal. Everything
  // that differs between screens is read off the host from here on, so no
  // later phase asks what kind of screen it is looking at.
  const host = hostFor(expanded);

  // Serving a screen through the wrong door is the one mistake the host cannot
  // absorb: a compiled screen has no player to show it to, and a form has no
  // entity to belong to.
  requireOwner(host, owner);

  // Phase 2: Compute layout using flexbox algorithm
  // Resolves sizes and x/y positions to absolute Pocket-space texels
  // Returns "NormalizedControlProps"
  // Whether THIS layout is frozen, which is not the same question as whether
  // the host always compiles. A form host serves both: an interpreted screen
  // re-measures on every present, a compiled one was baked at build time and
  // can never be measured again. Two things turn on the answer.
  //
  //  - A live text reserves room for its widest possible content, because
  //    nothing will re-fit the box when the string grows.
  //  - Nothing caps the scroll regions. A serialized screen draws its scrolls
  //    from the render pack's fixed pool; a compiled one emits a region per
  //    `<Scroll>`, so the pool's limit is not its limit. Applying it anyway
  //    would compile a three-scroll screen happily and then throw the first
  //    time a player opened it.
  const frozen = compiled ?? host.compiled;

  return { result: computeLayout(expanded, frozen), context, host, frozen };
}

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
 * @param compiled - Whether THIS screen's layout is baked into the pack. Omit
 *   to take the host's answer, which is right for every host that only ever
 *   compiles; the form host serves both kinds and has to be told.
 * @returns Fully processed JSX element tree and list of created instances
 */
export function buildTree(element: JSX.Element, owner: Owner, compiled?: boolean): JSX.Element {
  // A build that registered the pack's languages may compose text per language
  // at the width the layout gives it, which only a laid-out tree knows: such a
  // render runs again over the widths the pass before it recorded, until no
  // composing box moves. Three passes settle the one flip that can happen — a
  // composed paragraph grows a scroll's content past its viewport, and the
  // track that appears narrows the column.
  const rounds = buildLocales() === undefined ? 1 : MAX_BUILD_PASSES;
  // A compiled screen rendered at runtime draws its translated texts the way its build laid them out.
  const recorded = getSessionCompiled(owner).snapshot?.trans ?? [];
  const widths = new Map<number, number>();
  let laid: LaidOut;
  let passes = 0;
  let moved: boolean;

  do {
    beginWidthRound(widths, recorded);

    try {
      laid = layoutPass(element, owner, compiled);
    } finally {
      moved = endWidthRound();
    }

    passes += 1;
  } while (moved && passes < rounds);

  const { context, host, frozen } = laid;
  let { result } = laid;

  // Phase 3: Apply parent-child inheritance rules (visibility, enabled)
  // Initialize with root parent state
  const rootContext = createRootContext(context);

  result = applyInheritance(result, rootContext);

  // Phase 4: what the tree NEEDS against what the host OFFERS, plus the rules
  // every screen obeys — so dynamically-built or type-escaped trees fail loud,
  // by name, before anything is presented or emitted.
  validate(result, host, frozen);

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
