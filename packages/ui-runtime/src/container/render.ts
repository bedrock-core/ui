import type { ItemStack, Player } from '@minecraft/server';
import type { Context, Dispatcher } from '../core/fabric/types';
import { expandStatic } from '../core/render/phases';
import type { JSX } from '../jsx';

/**
 * Running a compiled screen's own component, per player, at runtime.
 *
 * The layout is frozen — the build decided it — but everything inside it is
 * live. The trick is that both sides run the SAME component: the build runs it
 * once with initial state to decide the shape, and this runs it again per player
 * with real state to decide the values. Because the shape cannot change, the two
 * walks visit the same nodes in the same order, and a node's position in that
 * walk is all the addressing anyone needs. Nothing is named, nothing is
 * registered, and a handler is simply the one attached to the third button.
 */

/** What a render found, in the order the compiler allocated for it. */
export interface ScreenValues {
  /** One per text run. */
  texts: string[];
  /** One per clipped image, 0..1. */
  ratios: number[];
  /** One per slot, in slot order. Absent where the author attached nothing. */
  onPress: (((player: Player) => void) | undefined)[];
  onInsert: (((player: Player, stack: ItemStack) => void) | undefined)[];
  onRemove: (((player: Player) => void) | undefined)[];
}

const empty = (): ScreenValues => ({
  texts: [], ratios: [], onPress: [], onInsert: [], onRemove: [],
});

const asArray = (children: unknown): unknown[] => {
  if (Array.isArray(children)) {
    return children;
  }

  return children === undefined ? [] : [children];
};

const isElement = (value: unknown): value is JSX.Element =>
  !!value && typeof value === 'object' && 'type' in value;

/**
 * A hook initialiser may be a value or a thunk. A PREDICATE rather than a cast,
 * so nothing is asserted about a type the caller chose.
 */
const isThunk = <T>(value: T | (() => T)): value is () => T => typeof value === 'function';

/** Same idea for a state setter, which takes the previous value. */
const isUpdater = <T>(value: T | ((prev: T) => T)): value is (prev: T) => T =>
  typeof value === 'function';

const handler = <T>(value: unknown): T | undefined =>
  // A prop is `unknown` by the time it reaches here; whether it is callable is
  // the only thing worth checking, and the component's own types guarantee the
  // rest.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  typeof value === 'function' ? value as T : undefined;

/**
 * Walks an expanded tree the way the compiler walks a laid-out one.
 *
 * Fragments are transparent on both sides, which is what makes a component
 * boundary free and keeps the two orders identical.
 */
const collect = (element: JSX.Element, into: ScreenValues): void => {
  const type = String(element.type);
  const props: Record<string, unknown> = element.props;

  if (type === 'container_text') {
    into.texts.push(typeof props.text === 'string' ? props.text : '');
  }

  if (type === 'image' && props.clip === true) {
    into.ratios.push(typeof props.value === 'number' ? props.value : 0);
  }

  if (type === 'container_slot') {
    into.onPress.push(handler<(player: Player) => void>(props.onPress));
    into.onInsert.push(handler<(player: Player, stack: ItemStack) => void>(props.onInsert));
    into.onRemove.push(handler<(player: Player) => void>(props.onRemove));
  }

  for (const child of asArray(props.children)) {
    if (isElement(child)) {
      collect(child, into);
    }
  }
};

/** One live screen: a player's state, and the values their last render produced. */
export class ScreenRender {
  /**
   * Hook state, in call order.
   *
   * A frozen shape means the nth hook call of one render is the nth of the next
   * — the same reason positions can address channels — so one ordered list does
   * the whole job, with none of a fiber tree's bookkeeping.
   */
  private readonly cells: unknown[] = [];

  private index = 0;

  private readonly contexts = new Map<unknown, unknown>();

  public values: ScreenValues = empty();

  public constructor(
    private readonly screen: () => JSX.Element,
    private readonly player: Player,
    /** Called when state changed, so the session can write what moved. */
    private readonly onChange: () => void,
  ) {}

  /** Re-runs the component and re-reads every value out of the result. */
  public render(): void {
    this.index = 0;

    const tree = expandStatic({ type: this.screen, props: {} }, this.contexts, this.dispatcher());
    const values = empty();

    collect(tree, values);
    this.values = values;
  }

  /** Reserves this call's cell, seeding it on the first render only. */
  private cell<T>(initial: T | (() => T)): number {
    const at = this.index;

    this.index += 1;

    if (at >= this.cells.length) {
      this.cells.push(isThunk(initial) ? initial() : initial);
    }

    return at;
  }

  /** Replaces a cell and re-renders, unless nothing actually changed. */
  private commit(at: number, next: unknown): void {
    if (Object.is(this.cells[at], next)) {
      return;
    }

    this.cells[at] = next;
    this.render();
    this.onChange();
  }

  private read<T>(at: number): T {
    // The cells are heterogeneous by nature — one list holds every hook in the
    // screen — so a value comes back untyped and the hook's own parameter is
    // what re-types it. The same trade the fiber dispatcher makes.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return this.cells[at] as T;
  }

  private dispatcher(): Dispatcher {
    return {
      useState: <T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] => {
        const at = this.cell(initial);

        return [this.read<T>(at), (value: T | ((prev: T) => T)): void => {
          // An updater takes the previous value; a plain value replaces it. The
          // distinction is the same one React makes, and for the same reason:
          // two presses in one tick must both count.
          this.commit(at, isUpdater(value) ? value(this.read<T>(at)) : value);
        }];
      },

      useReducer: <S, A>(
        reducer: (state: S, action: A) => S,
        initial: S,
      ): [S, (action: A) => void] => {
        const at = this.cell(initial);

        return [this.read<S>(at), (action: A): void => {
          this.commit(at, reducer(this.read<S>(at), action));
        }];
      },

      useRef: <T>(initial: T): { current: T } => {
        const at = this.cell<{ current: T }>(() => ({ current: initial }));

        return this.read<{ current: T }>(at);
      },

      useEffect: (): void => {
        // A compiled screen has no mount or unmount of its own: the session owns
        // open and close, and a render here is a value change, not a lifecycle.
      },

      useEvent: (): void => {
        // Same — a subscription belongs to the session, which outlives a render.
      },

      usePlayer: (): Player => this.player,

      useExit: (): (() => void) =>
        // Nothing in the container API closes an open screen, so this does
        // nothing rather than pretending otherwise.
        () => undefined,

      useContext: <T>(ctx: Context<T>): T => {
        if (!this.contexts.has(ctx)) {
          return ctx.defaultValue;
        }

        // Heterogeneous for the same reason the cells are: one map holds every
        // provider in scope, so the context's own parameter re-types the value.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        return this.contexts.get(ctx) as T;
      },
    };
  }
}
