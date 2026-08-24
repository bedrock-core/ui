import type { JSX } from '../../../jsx';
import { isContextProvider } from '../../fabric';
import { setCurrentFiber } from '../../fabric/registry';
import type { Context, Dispatcher } from '../../fabric/types';
import { isElement } from '../../guards';

/**
 * Build-time expansion: the same job {@link expandAndResolveContexts} does at
 * runtime, minus everything that needs a player.
 *
 * A compiled screen is rendered once, on a build machine, with no player, no
 * fibers and no lifecycle. Its layout is then frozen into JSON UI and serves
 * every player who opens it. So components, props, composition and context all
 * work exactly as they do today — and anything that implies per-player or
 * over-time state cannot, because there is nothing for it to belong to.
 *
 * Hooks work here and return their INITIAL values, because that is what decides
 * the shape: the tree the build sees is the tree every player gets, and state
 * only ever changes what is written to a channel afterwards. The one thing that
 * cannot work is anything needing a player, and that throws with an explanation
 * rather than an `outside an active fiber` stack.
 */

/** Thrown when a compiled screen calls a hook that only exists at runtime. */
export class CompileTimeHookError extends Error {
  public constructor(hook: string, why: string, instead: string) {
    super(
      `${hook}() cannot be used in a compiled screen.\n`
      + `  ${why}\n`
      + `  Instead: ${instead}`,
    );

    this.name = 'CompileTimeHookError';
  }
}

const NO_PLAYER = 'One compiled layout serves every player, so there is no player to read.';

/** Context values in scope for the component currently being expanded. */
let contexts = new Map<unknown, unknown>();

const noop = (): void => {
  /* nothing to do at build time */
};

/** A hook initialiser may be a value or a thunk. A predicate, so nothing is cast. */
const isThunk = <T>(value: T | (() => T)): value is () => T => typeof value === 'function';

/**
 * The build-time dispatcher.
 *
 * Hooks WORK here, and return their initial values: a compiled screen is
 * rendered once to decide its shape, and the shape is whatever the initial
 * state produces. The same component is then re-rendered per player at runtime
 * with real state, and the difference is written to channels — so `useState` is
 * how a value gets onto a channel in the first place, not something to route
 * around.
 *
 * What still cannot work is anything needing a PLAYER, because there is not one
 * on a build machine. Those throw, and the error is the documentation.
 */
const CompileDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
    return [isThunk(initial) ? initial() : initial, noop];
  },

  useReducer<S, A>(_reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void] {
    return [initial, noop];
  },

  useEffect(): void {
    // Effects belong to a render loop, and the build has none. Ignored rather
    // than rejected, so a component can be shared between a form and a screen.
  },

  useRef<T>(initial: T): { current: T } {
    return { current: initial };
  },

  useEvent(): void {
    // Same as useEffect: nothing to subscribe to on a build machine.
  },

  usePlayer(): never {
    throw new CompileTimeHookError(
      'usePlayer',
      NO_PLAYER,
      'read it at runtime instead — the value reaches the screen on a channel.',
    );
  },

  useExit(): () => void {
    return noop;
  },

  /** Providers are resolved while the tree expands, exactly as at runtime. */
  useContext<T>(ctx: Context<T>): T {
    // The stack is heterogeneous by nature — one map holds every provider in
    // scope — so the value comes back untyped and the context's own parameter is
    // what re-types it. Same trade the runtime dispatcher makes.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return contexts.has(ctx) ? contexts.get(ctx) as T : ctx.defaultValue;
  },
};

const asChildren = (children: JSX.Node): JSX.Node[] => {
  if (Array.isArray(children)) {
    return children;
  }

  return isElement(children) ? [children] : [];
};

const expandChildren = (children: JSX.Node): JSX.Element[] =>
  asChildren(children)
    .filter(isElement)
    .map(child => expandNode(child));

function expandNode(element: JSX.Element): JSX.Element {
  // A function component: call it, then expand whatever it returned.
  if (typeof element.type === 'function') {
    const rendered = element.type(element.props) as JSX.Node;

    if (!isElement(rendered)) {
      return { type: 'fragment', props: { children: [] } };
    }

    return expandNode(rendered);
  }

  // A provider: its value is in scope for the subtree, and then it disappears.
  if (isContextProvider(element)) {
    const { __context: ctx, value, children } = element.props;
    const outer = contexts;

    contexts = new Map(outer);
    contexts.set(ctx, value);

    try {
      return { type: 'fragment', props: { children: expandChildren(children) } };
    } finally {
      contexts = outer;
    }
  }

  return {
    type: element.type,
    nativeArgs: element.nativeArgs,
    props: { ...element.props, children: expandChildren(element.props.children) },
  };
}

/**
 * Expands a tree with no player attached, resolving contexts and rejecting any
 * hook that cannot mean anything at build time.
 *
 * @param element - Root element of the screen being compiled.
 * @param initial - Context values to seed, for providers supplied by the build
 *   rather than by the tree itself (theme, i18n, pack config).
 * @param dispatcher - What hooks resolve against. Defaults to the build-time
 *   one, which hands back initial values; the container runtime passes a real
 *   one so the SAME component re-renders per player with real state.
 * @returns The tree with every function component expanded.
 * @throws {@link CompileTimeHookError} when a build-time hook needs a player.
 */
export function expandStatic(
  element: JSX.Element,
  initial?: ReadonlyMap<unknown, unknown>,
  dispatcher: Dispatcher = CompileDispatcher,
): JSX.Element {
  contexts = new Map(initial ?? []);

  setCurrentFiber(undefined, dispatcher);

  try {
    return expandNode(element);
  } finally {
    setCurrentFiber(undefined, undefined);
    contexts = new Map();
  }
}
