import { BUTTON_TYPE } from '../../components/Button';
import { isTextElementType, liveTextLength } from '../../components/Text';
import type { JSX } from '../../jsx';
import { BUILD_OWNER, getFibersForOwner } from '../fabric';
import type { Fiber } from '../fabric/types';
import { childElements } from '../guards';
import { setStateSeed, type StateSeed } from '../render/session';
import { cleanupComponentTree } from '../render/tree';
import { claim, visibleCandidates, visibleWalk } from './claims';

/**
 * What in a screen is live, found by asking rather than by being told.
 *
 * A compiled screen is baked: its text is written into JSON UI at build time,
 * so a string that changes at runtime shows the build's value forever and says
 * nothing about it. `maxLength` is what reserves the cells a changing string
 * needs — and an author who forgets it gets a screen that looks right in every
 * screenshot and is wrong the moment anything happens.
 *
 * This is the build finding that out. It renders the screen once for the
 * reference, then re-renders it with each state slot perturbed and diffs what
 * came out. Anything that moved is live, whether or not the author said so.
 *
 * It is only ever run at BUILD time, on a machine with no world: the runtime
 * knows what is live because the build already told it.
 *
 * ## What it cannot see
 *
 * Probing is not proof. A value that only changes past a threshold no probe
 * crosses (`count > 100`) is missed, which is why `maxLength` stays an
 * explicit marker rather than becoming a hint — declaring it makes the text
 * live whatever the probes saw. The reverse never happens: everything this
 * reports really did change between two renders of the same screen.
 */

/** A baked string that moved when state did. */
export interface FrozenText {
  /** Which baked text it is, counting in document order from 0. */
  readonly position: number;
  /** What the reference render produced. */
  readonly before: string;
  /** What a perturbed render produced instead. */
  readonly after: string;
  /** The longest of the two, so the message can suggest a `maxLength`. */
  readonly longest: number;
}

/** A render that produced a different set of cells or channels. */
export interface ShapeChange {
  readonly before: string;
  readonly after: string;
}

export interface Probe {
  /** Baked text that a state change moved. Empty when nothing is frozen. */
  readonly frozen: readonly FrozenText[];
  /**
   * The shape a state change broke, if one did. A compiled screen cannot add,
   * drop or reorder a cell between renders — the build numbered them once.
   */
  readonly shape?: ShapeChange;
  /**
   * Elements whose `visible` a state change flipped, as ordinals into
   * {@link visibleCandidates}. Not an error: a live visible is what a host
   * CARRIES — a form spends one entry on it — and the ordinals are what the
   * compiled snapshot hands the runtime so both sides mark the same elements.
   * A host with no bool carrier turns these into build errors instead.
   */
  readonly liveVisibles: readonly number[];
}

/** A state or reducer slot, and where it lives. */
interface Slot {
  readonly fiber: string;
  readonly index: number;
  readonly value: unknown;
}

/** The string a baked `<Text>` shows, whatever kind of tail it carries. */
const bakedTextOf = (element: JSX.Element): string => {
  const { value } = element.props;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;

  if (typeof tail === 'string') {
    return tail;
  }

  // A RawMessage tail is the client's to resolve; compare it structurally, so
  // a changing key or parameter still counts as movement.
  return tail === undefined ? '' : JSON.stringify(tail);
};

/**
 * Every string in a tree that the author could have made live, in document
 * order.
 *
 * Two kinds are left out, both because the author has already said what they
 * are. Live text reserved its cells and is not baked at all. And a button's
 * children are its FACE — baked by definition, which is why live text inside
 * one is refused outright — so a caption that moves with the button's own
 * state is the documented behaviour rather than a mistake. The ore-styled
 * button is exactly that: it colours its caption by `enabled`, and on a
 * compiled screen only the background swaps.
 */
export const bakedTexts = (tree: JSX.Element): string[] => {
  const found: string[] = [];

  const visit = (element: JSX.Element): void => {
    const { type } = element;

    if (type === BUTTON_TYPE) {
      return;
    }

    if (typeof type === 'string' && isTextElementType(type) && liveTextLength(element) === undefined) {
      found.push(bakedTextOf(element));
    }

    for (const child of childElements(element.props.children)) {
      visit(child);
    }
  };

  visit(tree);

  return found;
};

/**
 * What the screen asked its host for, as one comparable line. Two renders of a
 * compiled screen have to agree on this exactly — it is what the build
 * numbered and what the runtime walks again.
 */
export const shapeOf = (tree: JSX.Element, analysis?: Parameters<typeof claim>[1]): string => {
  const { cells, channels } = claim(tree, analysis);

  return [
    cells.map(cell => cell.role).join(','),
    channels.map(channel => `${channel.carrier}:${channel.length}`).join(','),
    `text:${bakedTexts(tree).length}`,
    // Every element, not only the claiming ones: a conditionally-rendered
    // panel is as much a shape change as a vanished button — `visible` is the
    // one legal way for a subtree to come and go — and the count is also what
    // keeps the visible ordinals aligned between the renders compared below.
    `nodes:${visibleCandidates(tree).length}`,
  ].join(' | ');
};

/** Every state and reducer slot the reference render left behind. */
const slotsOf = (fibers: readonly Fiber[]): Slot[] => {
  const slots: Slot[] = [];

  for (const fiber of fibers) {
    fiber.hookStates.forEach((hook, index) => {
      if (hook.tag === 'state' || hook.tag === 'reducer') {
        slots.push({ fiber: fiber.id, index, value: hook.value });
      }
    });
  }

  return slots;
};

/**
 * What to try in a slot instead of what it holds.
 *
 * Enough to move anything that reads the value, and no more: a boolean has one
 * other value, a number is nudged and zeroed, a string is grown and emptied.
 * A slot holding anything else is left alone — perturbing an object
 * meaningfully needs to know what the component does with it, which is exactly
 * what cannot be known from here.
 */
const probeValues = (value: unknown): unknown[] => {
  if (typeof value === 'boolean') {
    return [!value];
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? [...new Set([value + 1, 0])] : [];
  }

  if (typeof value === 'string') {
    return value === '' ? ['x'] : [`${value}x`, ''];
  }

  return [];
};

/** The seed for one probe: every slot at its reference value, with one replaced. */
const seedWith = (slots: readonly Slot[], target: Slot, value: unknown): StateSeed => {
  const seed = new Map<string, Map<number, unknown>>();

  for (const slot of slots) {
    const values = seed.get(slot.fiber) ?? new Map<number, unknown>();

    values.set(slot.index, slot === target ? value : slot.value);
    seed.set(slot.fiber, values);
  }

  return seed;
};

/**
 * Renders a screen with each state slot perturbed and reports what moved.
 *
 * @param build - One render leaving its fibers in place, under the build owner
 *   — `buildScreenOnce` for a container screen.
 * @returns What is frozen, and the shape a probe broke if one did.
 */
export function probeLiveness(build: () => JSX.Element): Probe {
  cleanupComponentTree(BUILD_OWNER);

  const reference = build();
  const slots = slotsOf(getFibersForOwner(BUILD_OWNER));
  const referenceShape = shapeOf(reference);
  const referenceTexts = bakedTexts(reference);
  const candidates = visibleCandidates(reference);
  const referenceVisibles = candidates.map(element => element.props.visible !== false);

  const frozen = new Map<number, FrozenText>();
  // Declared carriers first: an element marked `liveVisible` is carried
  // whether or not a probe below flips it — a visibility that is false in
  // the reference and in every perturbation (a row whose kind no probe
  // value reaches) would otherwise bake hidden.
  const liveVisibles = new Set<number>(
    candidates.flatMap((element, ordinal) => element.props.liveVisible === true ? [ordinal] : []),
  );
  let shape: ShapeChange | undefined;

  for (const slot of slots) {
    for (const value of probeValues(slot.value)) {
      cleanupComponentTree(BUILD_OWNER);
      setStateSeed(BUILD_OWNER, seedWith(slots, slot, value));

      let probed: JSX.Element;

      try {
        probed = build();
      } catch {
        // A component that cannot survive this value tells us nothing about
        // what is live; a real state change would have to be one it accepts.
        continue;
      }

      const probedShape = shapeOf(probed);

      if (probedShape !== referenceShape) {
        shape ??= { before: referenceShape, after: probedShape };

        // Positions no longer line up, so nothing below can be compared.
        continue;
      }

      bakedTexts(probed).forEach((after, position) => {
        const before = referenceTexts[position] ?? '';

        if (after !== before && !frozen.has(position)) {
          frozen.set(position, {
            position,
            before,
            after,
            longest: Math.max(before.length, after.length),
          });
        }
      });

      // Same positions on both sides — the shape check above already held.
      // Only subtree ROOTS are carriers: the inherit pass stamps `visible:
      // false` down a hidden subtree, so every descendant flips with its
      // ancestor, and one gate at the root hides them all. An element that
      // flips on its own in some other probe earns its own ordinal there.
      const { elements, parents } = visibleWalk(probed);
      const flipped = new Set<number>();

      elements.forEach((element, ordinal) => {
        if ((element.props.visible !== false) !== (referenceVisibles[ordinal] ?? true)) {
          flipped.add(ordinal);
        }
      });

      for (const ordinal of flipped) {
        let ancestor = parents[ordinal] ?? -1;
        let root = true;

        while (ancestor !== -1) {
          if (flipped.has(ancestor)) {
            root = false;
            break;
          }

          ancestor = parents[ancestor] ?? -1;
        }

        if (root) {
          liveVisibles.add(ordinal);
        }
      }
    }
  }

  cleanupComponentTree(BUILD_OWNER);

  return {
    frozen: [...frozen.values()].sort((a, b) => a.position - b.position),
    liveVisibles: [...liveVisibles].sort((a, b) => a - b),
    ...shape === undefined ? {} : { shape },
  };
}
