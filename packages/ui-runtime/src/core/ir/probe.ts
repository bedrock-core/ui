import { BUTTON_TYPE } from '../../components/Button';
import { listCapacity } from '../../components/List';
import { isTextElementType, liveTextLength } from '../../components/Text';
import type { JSX } from '../../jsx';
import { BUILD_OWNER, getFibersForOwner } from '../fabric';
import type { Fiber } from '../fabric/types';
import { childElements } from '../guards';
import type { Player } from '@minecraft/server';
import { isHandler, type PressEvent } from '../events';
import { setStateSeed, type StateSeed } from '../render/session';
import { cleanupComponentTree } from '../render/tree';
import { claim, hasMechanism, visibleCandidates, visibleWalk } from './claims';

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

/** A baked prop — a texture, a colour, a size — that moved when state did. */
export interface FrozenProp {
  /** Which baked element it is, counting in document order from 0. */
  readonly position: number;
  /** The element's native type, so the message can name what moved. */
  readonly type: string;
  /** The prop's name. */
  readonly prop: string;
  /** What the reference render produced, as JSON. */
  readonly before: string;
  /** What a perturbed render produced instead, as JSON. */
  readonly after: string;
}

/**
 * One element's baked props that follow state, and every combination the probe
 * saw them in — the reference render's first.
 *
 * This is what a carrier needs: the build draws the element once per
 * combination and the runtime says which one is current, so the values have to
 * be the same list on both sides, in the same order.
 */
export interface VariantTable {
  /** Which baked element it is, counting in document order from 0. */
  readonly position: number;
  /** The element's native type. */
  readonly type: string;
  /**
   * Where each value of a look is read: the element's position in the baked
   * walk, and the prop on it. A button's look includes what its children draw,
   * because they are baked into its face.
   */
  readonly props: readonly { readonly position: number; readonly prop: string }[];
  /** One entry per distinct combination: a value per prop, in `props` order. */
  readonly combinations: readonly (readonly unknown[])[];
}

export interface Probe {
  /** Baked text that a state change moved. Empty when nothing is frozen. */
  readonly frozen: readonly FrozenText[];
  /**
   * Baked props that a state change moved: everything the build writes into
   * JSON UI except the two with carriers of their own, `text` and `visible`.
   * A screen showing one of these follows its state everywhere but here.
   */
  readonly props: readonly FrozenProp[];
  /**
   * The same movement as {@link Probe.props}, gathered per element: what a
   * host draws one variant of and carries the choice between.
   */
  readonly variants: readonly VariantTable[];
  /**
   * Boxes the layout solved differently between two renders: a size or a
   * place that follows state. Nothing carries one yet, and they usually follow
   * a look that does, so they are kept apart from it.
   */
  readonly geometry: readonly FrozenProp[];
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
 * Props no comparison should read, each because something else already owns it.
 *
 * `children` is the walk itself; `key` is the author's identity for a row;
 * `value` is the baked string {@link bakedTexts} compares and `maxLength` is
 * its declaration, which a change to would move the shape; `visible` and
 * `liveVisible` are the carried bit {@link visibleWalk} reports, and `enabled`
 * is the flag a press rides its own entry with. A prop named with two
 * underscores is the library talking to its own build — a width slot, a
 * recorded layout — rather than anything drawn.
 */
const NOT_BAKED = new Set(['children', 'key', 'maxLength', 'visible', 'liveVisible', 'enabled']);

/**
 * Private props that are drawn all the same.
 *
 * A name with two underscores is the library talking to its own build, which
 * is usually a declaration rather than anything on screen — but a label's
 * colour and alignment, a backdrop's texture and an option's font are private
 * only so no other reader of the element picks them up. They are painted, so a
 * state change that moves one moves the screen.
 */
const BAKED_PRIVATE = new Set(['__color', '__textAlign', '__background', '__optionFontType', '__optionFontScale']);

/**
 * What the layout solved rather than what an author wrote.
 *
 * A box that moves is part of its element's look wherever that look is drawn
 * by copying: inside a face, where a caption that drops two pixels when its
 * segment is chosen drops in that face alone, and on any element drawn once
 * per look. Only an element the HOST places — a button's cell, a slot, a live
 * string — keeps the build's box, and its movement is reported apart.
 */
const SOLVED = new Set(['jsonUIx', 'jsonUIy', 'jsonUIWidth', 'jsonUIHeight']);

/**
 * The solved position, as it is compared: from the element's parent rather
 * than from the canvas. A panel that moves then moves alone — its children
 * keep their place inside it — rather than every descendant reading as a look
 * of its own.
 */
const POSITION = ['jsonUIx', 'jsonUIy'] as const;

const isBakedProp = (element: JSX.Element, name: string, value: unknown, inside: boolean): boolean => {
  if (NOT_BAKED.has(name) || typeof value === 'function') {
    return false;
  }

  if (name.startsWith('__')) {
    return BAKED_PRIVATE.has(name);
  }

  // The string a `<Text>` shows is compared as text where the author can make
  // it live, and as part of a face where it is baked by definition: a button's
  // children are drawn into its face, so a caption that follows the button's
  // own state is one more thing that face draws.
  if (name === 'value') {
    return inside;
  }

  // A list's row count rides its own entry, declared by `max` the way a live
  // string declares `maxLength`; the rows it shows are gates on that count.
  return !(name === 'count' && listCapacity(element) !== undefined);
};

/**
 * Every element whose props the build bakes, in document order, with those
 * props.
 *
 * A button's children are left out for the reason {@link bakedTexts} leaves
 * them out: they are its face, drawn once per engine state, so a caption that
 * follows the button's own state is the documented behaviour. The button
 * itself is compared, which is where a state-driven look actually sits — a
 * `<Toggle>` is a button whose background follows `checked`.
 */
export const bakedProps = (tree: JSX.Element): { type: string; props: Record<string, unknown> }[] => {
  const { elements, owners, parents } = walkWithOwners(tree);

  return elements.map((element, ordinal) => {
    const props: Record<string, unknown> = {};

    for (const [name, value] of Object.entries(element.props)) {
      if (isBakedProp(element, name, value, owners[ordinal] !== -1)) {
        props[name] = value;
      }
    }

    const parent = elements[parents[ordinal] ?? -1];

    for (const name of POSITION) {
      const own = props[name];
      const origin = parent?.props[name];

      if (typeof own === 'number' && typeof origin === 'number') {
        props[name] = own - origin;
      }
    }

    return { type: typeof element.type === 'string' ? element.type : 'component', props };
  });
};

/**
 * The elements {@link bakedProps} counts, in the same order: what a position
 * names, and which button each one is drawn inside.
 *
 * A button's children are walked too, because a checkbox's tick and a caption's
 * colour live there — but they belong to the button's FACE, which is drawn as
 * one definition, so they are grouped under it rather than carried on their own.
 */
export const bakedWalk = (tree: JSX.Element): JSX.Element[] => walkWithOwners(tree).elements;

/**
 * The same walk, with each element's nearest button ancestor and its parent,
 * as positions in the walk (-1 for none).
 */
export const walkWithOwners = (tree: JSX.Element): { elements: JSX.Element[]; owners: number[]; parents: number[] } => {
  const elements: JSX.Element[] = [];
  const owners: number[] = [];
  const parents: number[] = [];

  const visit = (element: JSX.Element, owner: number, parent: number): void => {
    const ordinal = elements.length;

    elements.push(element);
    owners.push(owner);
    parents.push(parent);

    const inside = element.type === BUTTON_TYPE ? ordinal : owner;

    for (const child of childElements(element.props.children)) {
      visit(child, inside, ordinal);
    }
  };

  visit(tree, -1, -1);

  return { elements, owners, parents };
};

/**
 * Which of a table's looks an element is wearing, or the build's own when it is
 * wearing one the probe never saw.
 *
 * The same reading on both sides: the build writes the table off these props,
 * the runtime reads them again per present and says which row it landed on.
 */
export const lookIndexOf = (table: VariantTable, tree: JSX.Element): number => {
  const read = bakedProps(tree);
  const current = asText(table.props.map(({ position, prop }) => read[position]?.props[prop]));
  const index = table.combinations.findIndex(combination => asText(combination) === current);

  return index === -1 ? 0 : index;
};

/** The elements a recorded table's positions name, on this render's tree. */
export const variantsAt = (
  tree: JSX.Element,
  tables: readonly VariantTable[],
): ReadonlyMap<JSX.Element, VariantTable> => {
  const walked = bakedWalk(tree);
  const found = new Map<JSX.Element, VariantTable>();

  for (const table of tables) {
    const element = walked[table.position];

    if (element !== undefined) {
      found.set(element, table);
    }
  }

  return found;
};

/** What a prop is worth comparing as: stable for a value of any shape. */
const asText = (value: unknown): string => (value === undefined ? 'undefined' : JSON.stringify(value) ?? 'undefined');

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

/** How many values one leaf of an object contributes, so no single field spends the budget. */
const PER_LEAF = 8;

/** How many renders an object in one slot is worth altogether. */
const LEAF_BUDGET = 32;

/** How many values a screen's own text can suggest for one slot. */
const CANDIDATE_BUDGET = 12;

/** The longest string worth trying in a slot: a key or an option, never a sentence. */
const CANDIDATE_LENGTH = 32;

/**
 * The values a screen is already made of.
 *
 * A slot holding `'b'` tells a probe nothing about `'a'` and `'c'`, so nudging
 * the letter — the only thing a probe can do knowing nothing — leaves every
 * other option of a chooser unvisited, and their looks unfound. The screen
 * itself names them: an option's key is drawn somewhere in the tree, so the
 * strings and numbers a tree holds are exactly the values its state takes.
 */
const candidatesIn = (tree: JSX.Element): { strings: string[]; numbers: number[] } => {
  const strings = new Set<string>();
  const numbers = new Set<number>();

  const take = (value: unknown): void => {
    if (typeof value === 'string' && value.length > 0 && value.length <= CANDIDATE_LENGTH) {
      strings.add(value);

      return;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      numbers.add(value);

      return;
    }

    if (typeof value === 'object' && value !== null && 'tail' in value) {
      take(value.tail);
    }
  };

  for (const element of bakedWalk(tree)) {
    for (const [name, value] of Object.entries(element.props)) {
      if (name !== 'children' && !name.startsWith('__')) {
        take(value);
      }
    }
  }

  return {
    strings: [...strings].slice(0, CANDIDATE_BUDGET),
    numbers: [...numbers].slice(0, CANDIDATE_BUDGET),
  };
};

/**
 * What to try in a slot instead of what it holds.
 *
 * Enough to move anything that reads the value, and no more: a boolean has one
 * other value, a number is nudged and zeroed, a string is grown and emptied.
 * An object or an array is perturbed one leaf at a time — a screen reading
 * `player.coins` moves with the field, not with the object — up to a budget,
 * because a document with hundreds of fields would otherwise be rendered
 * hundreds of times.
 */
const probeValues = (value: unknown, candidates: { strings: string[]; numbers: number[] }): unknown[] => {
  if (typeof value === 'boolean') {
    return [!value];
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? [...new Set([value + 1, 0, ...candidates.numbers.filter(number => number !== value)])]
      : [];
  }

  if (typeof value === 'string') {
    // The screen's own strings first: one of them is the option this slot is
    // choosing between, and its look is only drawn while it is chosen.
    return [...new Set([...candidates.strings.filter(text => text !== value), value === '' ? 'x' : ''])];
  }

  return isWalkable(value) ? leafVariants(value, candidates) : [];
};

/** An array or a plain object: something whose leaves can be replaced one by one. */
const isWalkable = (value: unknown): value is Record<string, unknown> | unknown[] => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return Array.isArray(value) || prototype === Object.prototype || prototype === null;
};

/** The same collection with one leaf replaced, once per leaf a probe can move. */
const leafVariants = (
  value: Record<string, unknown> | unknown[],
  candidates: { strings: string[]; numbers: number[] },
): unknown[] => {
  // Per leaf rather than in one list, then taken in turns: a document whose
  // first field has many values would otherwise spend the whole budget before
  // the walk reached the field a screen actually draws.
  const perLeaf: unknown[][] = [];

  const visit = (node: Record<string, unknown> | unknown[], replace: (next: unknown) => unknown): void => {
    // A list of choices moves by gaining and losing members, not by its members
    // changing: what draws a chooser's option is whether it is in the list.
    if (Array.isArray(node)) {
      perLeaf.push(members(node, candidates).slice(0, PER_LEAF).map(member => replace(member)));
    }

    for (const [key, held] of Object.entries(node)) {
      const rebuild = (next: unknown): unknown => replace(Array.isArray(node)
        ? node.map((item, index) => (String(index) === key ? next : item))
        : { ...node, [key]: next });

      if (isWalkable(held)) {
        visit(held, rebuild);
        continue;
      }

      if (!Array.isArray(node)) {
        perLeaf.push(probeValues(held, candidates).slice(0, PER_LEAF).map(rebuild));
      }
    }
  };

  visit(value, next => next);

  const variants: unknown[] = [];

  for (let round = 0; variants.length < LEAF_BUDGET && perLeaf.some(leaf => leaf.length > round); round += 1) {
    for (const leaf of perLeaf) {
      if (leaf.length > round && variants.length < LEAF_BUDGET) {
        variants.push(leaf[round]);
      }
    }
  }

  return variants;
};

/** The same list with one member dropped, and with one of the screen's own values added. */
const members = (list: readonly unknown[], candidates: { strings: string[]; numbers: number[] }): unknown[] => {
  const held = new Set(list.map(item => asText(item)));
  const added = [...candidates.strings, ...candidates.numbers]
    .filter(candidate => !held.has(asText(candidate)))
    .map(candidate => [...list, candidate]);

  return [...list.map((_dropped, index) => list.filter((_item, at) => at !== index)), ...added].slice(0, LEAF_BUDGET);
};

/**
 * Every press the screen offers, in the order they are drawn.
 *
 * Guessing a value only reaches the state a screen was built in: a chooser
 * holding `'b'` says nothing about `'a'`, whose key is never drawn anywhere.
 * What a screen does say is how it is USED — each press is a way it changes —
 * so pressing each one and rendering again finds the looks a player can
 * actually reach.
 */
const pressesIn = (tree: JSX.Element): ((event: PressEvent) => unknown)[] =>
  bakedWalk(tree).flatMap((element) => {
    const { onPress } = element.props;

    return isHandler<(event: PressEvent) => unknown>(onPress) ? [onPress] : [];
  });

/**
 * The event a probe hands a handler. Nobody pressed anything, so there is no
 * player: a handler that asks for one throws, which the probe reads as "this
 * press needs a world" and moves on, rather than passing a fake player on.
 */
const PROBE_EVENT: PressEvent = {
  get player(): Player {
    throw new TypeError('the build probed this press; no player made it');
  },
};

/** How many of a screen's presses are worth two renders each. */
const PRESS_BUDGET = 64;

/** The seed for one probe: every slot at its reference value, with one replaced. */
const seedWith = (slots: readonly Slot[], target?: Slot, value?: unknown): StateSeed => {
  const seed = new Map<string, Map<number, unknown>>();

  for (const slot of slots) {
    const values = seed.get(slot.fiber) ?? new Map<number, unknown>();

    values.set(slot.index, slot === target ? value : slot.value);
    seed.set(slot.fiber, values);
  }

  return seed;
};

/**
 * The props that moved, gathered per element with every combination they can
 * be in.
 *
 * A probe changes one thing at a time, so it never renders two causes at once:
 * a word coloured by a choice and stepped aside by a toggle is seen coloured,
 * and seen stepped, but never both. So the props are split by what moved them
 * — those that moved in exactly the same renders share a cause and are kept as
 * the tuples seen — and the table is every pairing of those causes. A cause
 * split in two only adds looks nobody wears; a pairing left out would be a look
 * the screen cannot show.
 *
 * The reference render's combination is first, because that is the one the
 * build bakes when nothing says otherwise, and because a runtime that cannot
 * place its own values falls back to it.
 */
const variantTables = (
  moved: readonly FrozenProp[],
  reference: readonly { type: string; props: Record<string, unknown> }[],
  seen: readonly Record<string, unknown>[][],
  owners: readonly number[],
): VariantTable[] => {
  const grouped = new Map<number, { position: number; prop: string }[]>();

  for (const { position, prop } of moved) {
    const owner = owners[position] ?? -1;
    const group = owner === -1 ? position : owner;

    grouped.set(group, [...grouped.get(group) ?? [], { position, prop }]);
  }

  return [...grouped.entries()].sort(([a], [b]) => a - b).map(([group, read]) => {
    const props = [...read].sort((a, b) => a.position - b.position || a.prop.localeCompare(b.prop));
    const renders = Math.max(...props.map(({ position }) => seen[position]?.length ?? 0), 0);

    const valueAt = (index: number, render: number): unknown => {
      const at = props[index];

      return at === undefined ? undefined : seen[at.position]?.[render]?.[at.prop];
    };

    // Props that moved in the same renders share a cause.
    const causes = new Map<string, number[]>();

    props.forEach((_read, index) => {
      const moved: number[] = [];

      for (let render = 1; render < renders; render += 1) {
        if (asText(valueAt(index, render)) !== asText(valueAt(index, 0))) {
          moved.push(render);
        }
      }

      const key = moved.join(',');

      causes.set(key, [...causes.get(key) ?? [], index]);
    });

    // Each cause's values as the probe saw them together, the reference's first.
    const options = [...causes.values()].map((indices) => {
      const tuples: unknown[][] = [];
      const known = new Set<string>();

      for (let render = 0; render < renders; render += 1) {
        const tuple = indices.map(index => valueAt(index, render));
        const key = asText(tuple);

        if (!known.has(key)) {
          known.add(key);
          tuples.push(tuple);
        }
      }

      return { indices, tuples };
    });

    // Every pairing of the causes, the reference's own first.
    let combinations: unknown[][] = [props.map(() => undefined)];

    for (const { indices, tuples } of options) {
      combinations = combinations.flatMap(partial => tuples.map((tuple) => {
        const next = [...partial];

        indices.forEach((index, at) => {
          next[index] = tuple[at];
        });

        return next;
      }));
    }

    return { position: group, type: reference[group]?.type ?? 'component', props, combinations };
  });
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
  const referenceProps = bakedProps(reference);
  const { elements: referenceElements, owners } = walkWithOwners(reference);
  const tried = candidatesIn(reference);
  const candidates = visibleCandidates(reference);
  const referenceVisibles = candidates.map(element => element.props.visible !== false);

  const frozen = new Map<number, FrozenText>();
  const moved = new Map<string, FrozenProp>();
  const solved = new Map<string, FrozenProp>();
  // Every render's props, per element, so a prop that moved can be read back
  // as the set of values it took rather than as the first change alone.
  const seen: Record<string, unknown>[][] = referenceProps.map(entry => [entry.props]);
  // Declared carriers first: an element marked `liveVisible` is carried
  // whether or not a probe below flips it — a visibility that is false in
  // the reference and in every perturbation (a row whose kind no probe
  // value reaches) would otherwise bake hidden.
  const liveVisibles = new Set<number>(
    candidates.flatMap((element, ordinal) => element.props.liveVisible === true ? [ordinal] : []),
  );
  let shape: ShapeChange | undefined;

  /** What one other render of the same screen says, whatever reached it. */
  const compare = (probed: JSX.Element): void => {
    const probedShape = shapeOf(probed);

    if (probedShape !== referenceShape) {
      shape ??= { before: referenceShape, after: probedShape };

      // Positions no longer line up, so nothing below can be compared.
      return;
    }

    bakedProps(probed).forEach(({ type, props }, position) => {
      const before = referenceProps[position];

      if (before === undefined) {
        return;
      }

      seen[position]?.push(props);

      for (const prop of new Set([...Object.keys(before.props), ...Object.keys(props)])) {
        const was = asText(before.props[prop]);
        const now = asText(props[prop]);
        const key = `${String(position)}.${prop}`;
        const placed = referenceElements[position];
        const laidOut = SOLVED.has(prop) && (owners[position] ?? -1) === -1 && placed !== undefined && hasMechanism(placed);

        if (was !== now && !moved.has(key)) {
          (laidOut ? solved : moved).set(key, { position, type, prop, before: was, after: now });
        }
      }
    });

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
  };

  /** One render from a fresh set of fibers, seeded back to the reference state. */
  const rebuild = (): JSX.Element | undefined => {
    cleanupComponentTree(BUILD_OWNER);
    setStateSeed(BUILD_OWNER, seedWith(slots));

    try {
      return build();
    } catch {
      return undefined;
    }
  };

  for (const slot of slots) {
    for (const value of probeValues(slot.value, tried)) {
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

      compare(probed);
    }
  }

  // Then the screen's own answer. A guessed value only reaches the states its
  // shape suggests, and a chooser's other options are not among them; a press
  // is how the screen itself moves, so pressing each one and rendering again
  // reaches exactly the looks a player can put it in.
  const presses = pressesIn(reference).length;

  for (let index = 0; index < Math.min(presses, PRESS_BUDGET); index += 1) {
    const before = rebuild();
    const press = before === undefined ? undefined : pressesIn(before)[index];

    if (press === undefined) {
      continue;
    }

    try {
      press(PROBE_EVENT);
    } catch {
      // A handler that wanted a world, a player or a form got none. Whatever
      // it set before asking still moved, and that is what the render shows.
    }

    // The same fibers, so the setters the press called are what this renders.
    let after: JSX.Element;

    try {
      after = build();
    } catch {
      continue;
    }

    compare(after);
  }

  cleanupComponentTree(BUILD_OWNER);

  const props = [...moved.values()].sort((a, b) => a.position - b.position || a.prop.localeCompare(b.prop));

  return {
    frozen: [...frozen.values()].sort((a, b) => a.position - b.position),
    props,
    variants: variantTables(props, referenceProps, seen, owners),
    geometry: [...solved.values()].sort((a, b) => a.position - b.position || a.prop.localeCompare(b.prop)),
    liveVisibles: [...liveVisibles].sort((a, b) => a - b),
    ...shape === undefined ? {} : { shape },
  };
}
